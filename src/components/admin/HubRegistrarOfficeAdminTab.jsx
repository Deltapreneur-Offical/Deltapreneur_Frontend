import React, { useState, useEffect, useCallback } from 'react';
import { hubRegistrarOfficeAPI } from '../../api/services';
import './HubRegistrarOfficeAdminTab.css';

const HubRegistrarOfficeAdminTab = ({ toast } = {}) => {
  const notify = toast || { success: () => {}, error: () => {} };
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const [formData, setFormData] = useState({
    office_name: '',
    phone_number: '',
    full_address: '',
    map_link: '',
    display_order: 0,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchOffices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await hubRegistrarOfficeAPI.adminList();
      setOffices(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch offices:', error);
      notify.error('Failed to load offices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  const resetForm = () => {
    setFormData({
      office_name: '',
      phone_number: '',
      city: '',
      full_address: '',
      map_link: '',
      display_order: 0,
      is_active: true,
    });
    setEditingOffice(null);
    setShowForm(false);
  };

  const handleEdit = (office) => {
    setFormData({
      office_name: office.office_name,
      phone_number: office.phone_number,
      full_address: office.full_address,
      map_link: office.map_link || '',
      display_order: office.display_order,
      is_active: office.is_active,
    });
    setEditingOffice(office);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.office_name || !formData.phone_number || !formData.full_address) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (editingOffice) {
        await hubRegistrarOfficeAPI.adminUpdate(editingOffice.id, formData);
        notify.success('Office updated successfully');
      } else {
        await hubRegistrarOfficeAPI.adminCreate(formData);
        notify.success('Office created successfully');
      }
      resetForm();
      fetchOffices();
    } catch (error) {
      console.error('Failed to save office:', error);
      notify.error('Failed to save office');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (office) => {
    try {
      await hubRegistrarOfficeAPI.adminToggle(office.id, !office.is_active);
      notify.success(`Office ${office.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchOffices();
    } catch (error) {
      console.error('Failed to toggle office:', error);
      notify.error('Failed to update office status');
    }
  };

  const handleDelete = async (office) => {
    if (!window.confirm(`Are you sure you want to delete "${office.office_name}"?`)) {
      return;
    }

    try {
      await hubRegistrarOfficeAPI.adminDelete(office.id);
      notify.success('Office deleted successfully');
      fetchOffices();
    } catch (error) {
      console.error('Failed to delete office:', error);
      notify.error('Failed to delete office');
    }
  };

  if (loading) {
    return (
      <div className="hub-registrar-office-admin-tab">
        <div className="admin-header">
          <h2>Hub Registrar & Office Management</h2>
        </div>
        <div className="text-center py-12 text-gray-500">Loading offices...</div>
      </div>
    );
  }

  return (
    <div className="hub-registrar-office-admin-tab">
      <div className="admin-header">
        <h2>Hub Registrar & Office Management</h2>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add Office
        </button>
      </div>

      {showForm && (
        <div className="office-form-container">
          <h3>{editingOffice ? 'Edit Office' : 'Add New Office'}</h3>
          <form onSubmit={handleSubmit} className="office-form">
            <div className="form-group">
              <label>Office / Hub Name *</label>
              <input
                type="text"
                value={formData.office_name}
                onChange={(e) => setFormData({ ...formData, office_name: e.target.value })}
                placeholder="Enter office name"
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="Enter phone number"
                required
              />
            </div>

            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Enter city name"
                required
              />
            </div>

            <div className="form-group">
              <label>Full Address *</label>
              <textarea
                value={formData.full_address}
                onChange={(e) => setFormData({ ...formData, full_address: e.target.value })}
                placeholder="Enter full address"
                rows={3}
                required
              />
            </div>

            <div className="form-group">
              <label>Map Link (Optional)</label>
              <input
                type="url"
                value={formData.map_link}
                onChange={(e) => setFormData({ ...formData, map_link: e.target.value })}
                placeholder="https://maps.google.com/..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Display Order</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingOffice ? 'Update Office' : 'Create Office'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="offices-list">
        {offices.length === 0 ? (
          <div className="empty-state">
            <p>No offices found. Click "Add Office" to create one.</p>
          </div>
        ) : (
          <table className="offices-table">
            <thead>
              <tr>
                <th>Office Name</th>
                <th>Phone</th>
                <th>City</th>
                <th>Address</th>
                <th>Status</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offices.map((office) => (
                <tr key={office.id} className={office.is_deleted ? 'deleted' : ''}>
                  <td>{office.office_name}</td>
                  <td>{office.phone_number}</td>
                  <td>{office.city}</td>
                  <td className="address-cell">{office.full_address}</td>
                  <td>
                    <span className={`status-badge ${office.is_active ? 'active' : 'inactive'}`}>
                      {office.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{office.display_order}</td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEdit(office)}
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      className={`btn btn-sm ${office.is_active ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => handleToggleActive(office)}
                      title={office.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {office.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(office)}
                      title="Delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default HubRegistrarOfficeAdminTab;
