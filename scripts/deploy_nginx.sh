#!/bin/bash
set -x

CONFIG_PATH="/etc/nginx/sites-available/cobrother"
BACKUP_PATH="/etc/nginx/sites-available/cobrother.save"
# The file nginx ACTUALLY loads. Ubuntu convention is a symlink into
# sites-available; on this production box it is a SEPARATE physical file that
# nginx loads while the deploy only ever patched sites-available. Both files
# are kept in sync so deploy updates always reach the active config.
ACTIVE_PATH="/etc/nginx/sites-enabled/cobrother"
# Pre-deploy snapshot of the active file, kept OUTSIDE sites-enabled so nginx
# never includes it (sites-enabled/* glob). Used to roll back the exact
# previously-loaded config if `nginx -t` fails.
ACTIVE_PREDEPLOY="/etc/nginx/sites-available/cobrother.active-predeploy"
DEST="/opt/cobrother/frontend/dist"

echo "=== START NGINX DEPLOYMENT ==="

# Find nginx binary path
NGINX_BIN=$(which nginx 2>/dev/null || echo "/usr/sbin/nginx")
echo "Using Nginx binary: ${NGINX_BIN}"

# 1. Back up active configuration
if [ -f "${CONFIG_PATH}" ] && [ ! -f "${BACKUP_PATH}" ]; then
    echo "Creating secure backup of cobrother config..."
    cp "${CONFIG_PATH}" "${BACKUP_PATH}"
fi

# 1b. Snapshot the ACTIVE config (what nginx loads) before patching, so a
# failed `nginx -t` can restore the exact previously-loaded config.
# Only when it is a separate physical file (not a symlink to CONFIG_PATH).
if [ -f "${ACTIVE_PATH}" ] && [ ! -L "${ACTIVE_PATH}" ] && ! [ "${ACTIVE_PATH}" -ef "${CONFIG_PATH}" ]; then
    echo "Snapshotting active config for rollback: ${ACTIVE_PATH}"
    cp "${ACTIVE_PATH}" "${ACTIVE_PREDEPLOY}"
fi

# 2. Remove conflicting configs
rm -f /etc/nginx/sites-enabled/cobrother-frontend
rm -f /etc/nginx/sites-available/cobrother-frontend

# 3. Patch Nginx configuration dynamically
if [ -f "${CONFIG_PATH}" ]; then
    echo "Running Python updater on cobrother config..."
    python3 /tmp/scripts/update_nginx.py > /tmp/python_updater.log 2>&1
    python_status=$?
    echo "Python updater output:"
    cat /tmp/python_updater.log
    if [ $python_status -ne 0 ]; then
        echo "PYTHON UPDATER FAILED!"
        mkdir -p "${DEST}"
        cp /tmp/python_updater.log "${DEST}/debug-nginx.txt"
        chown -R ubuntu:ubuntu "${DEST}"
        exit 1
    fi
fi

# 4. Clean old error log to avoid stale reads
rm -f /tmp/nginx_error.log

# 5. Test configuration
if ! "${NGINX_BIN}" -t > /tmp/nginx_error.log 2>&1; then
    echo "NGINX CONFIG TEST FAILED! ROLLING BACK..."
    cat /tmp/nginx_error.log
    
    # Restore the backup
    if [ -f "${BACKUP_PATH}" ]; then
        cp "${BACKUP_PATH}" "${CONFIG_PATH}"
    fi

    # Restore the exact previously-loaded active config if it was snapshotted
    if [ -f "${ACTIVE_PREDEPLOY}" ]; then
        cp "${ACTIVE_PREDEPLOY}" "${ACTIVE_PATH}"
        rm -f "${ACTIVE_PREDEPLOY}"
    fi
    
    # Clean up conflicting files again
    rm -f /etc/nginx/sites-enabled/cobrother-frontend
    rm -f /etc/nginx/sites-available/cobrother-frontend
    
    # Write error log to web directory
    mkdir -p "${DEST}"
    cp /tmp/nginx_error.log "${DEST}/debug-nginx.txt"
    # debug-active-* must reflect what nginx actually loads (sites-enabled)
    if [ -f "${ACTIVE_PATH}" ]; then
        cp "${ACTIVE_PATH}" "${DEST}/debug-active-cobrother.conf"
    else
        cp "${CONFIG_PATH}" "${DEST}/debug-active-cobrother.conf"
    fi
    chown -R ubuntu:ubuntu "${DEST}"
    
    # Restart Nginx to restore origin status
    systemctl restart nginx
    echo "=== ROLLBACK COMPLETE ==="
    exit 1
else
    echo "NGINX CONFIG TEST PASSED! RESTARTING..."
    
    # Clean up conflicting files to be safe
    rm -f /etc/nginx/sites-enabled/cobrother-frontend
    rm -f /etc/nginx/sites-available/cobrother-frontend
    
    # Restart Nginx
    systemctl restart nginx
    
    # Write success log to web directory
    mkdir -p "${DEST}"
    echo "SUCCESS: Nginx updated and restarted successfully." > "${DEST}/debug-nginx.txt"
    # debug-active-* must reflect what nginx actually loads (sites-enabled)
    if [ -f "${ACTIVE_PATH}" ]; then
        cp "${ACTIVE_PATH}" "${DEST}/debug-active-cobrother.conf"
    else
        cp "${CONFIG_PATH}" "${DEST}/debug-active-cobrother.conf"
    fi
    chown -R ubuntu:ubuntu "${DEST}"

    # Deployment succeeded - drop the rollback snapshot
    rm -f "${ACTIVE_PREDEPLOY}"
    
    echo "=== DEPLOYMENT SUCCESSFUL ==="
fi
