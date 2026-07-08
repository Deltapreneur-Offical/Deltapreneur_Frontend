#!/bin/bash
set -x

CONFIG_PATH="/etc/nginx/sites-available/cobrother"
BACKUP_PATH="/etc/nginx/sites-available/cobrother.save"
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
    
    # Clean up conflicting files again
    rm -f /etc/nginx/sites-enabled/cobrother-frontend
    rm -f /etc/nginx/sites-available/cobrother-frontend
    
    # Write error log to web directory
    mkdir -p "${DEST}"
    cp /tmp/nginx_error.log "${DEST}/debug-nginx.txt"
    cp "${CONFIG_PATH}" "${DEST}/debug-active-cobrother.conf"
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
    cp "${CONFIG_PATH}" "${DEST}/debug-active-cobrother.conf"
    chown -R ubuntu:ubuntu "${DEST}"
    
    echo "=== DEPLOYMENT SUCCESSFUL ==="
fi
