import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { MaterialFormModal } from '../../components/MaterialFormModal';
import { MaterialDetailsModal } from '../../components/MaterialDetailsModal';

export interface Material {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export const MaterialsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/materials');
      setMaterials(response.data);
    } catch (err) {
      console.error('Failed to fetch materials:', err);
      setError('Failed to load materials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleAddClick = () => {
    setEditingMaterial(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (material: Material) => {
    setEditingMaterial(material);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Você tem certeza que deseja excluir este material?')) {
      try {
        await axios.delete(`/materials/${id}`);
        fetchMaterials();
      } catch (err) {
        console.error('Falha ao excluir material:', err);
        setError('Falha ao excluir material.');
      }
    }
  };

  const handleViewClick = (material: Material) => {
    setViewingMaterial(material);
    setIsDetailsModalOpen(true);
  };

  const handleFormSubmit = async (materialData: { title: string; description: string }) => {
    try {
      if (editingMaterial) {
        await axios.put(`/materials/${editingMaterial._id}`, materialData);
      } else {
        await axios.post('/materials', materialData);
      }
      fetchMaterials();
      setIsFormModalOpen(false);
    } catch (err) {
      console.error('Failed to save material:', err);
      setError('Failed to save material.');
    }
  };

  if (loading) return <div className="loading-message">Loading materials...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Materiais</h2>
      </div>

      {materials.length === 0 ? (
        <div className="empty">
          <p>Nenhum material encontrado.</p>
        </div>
      ) : (
        <div className="list-grid">
          {materials.map((material) => (
            <div key={material._id} className="card" onClick={() => handleViewClick(material)} style={{ cursor: 'pointer' }}>
              <div className="card-title">{material.title}</div>
              {isAdmin && (
                <div className="material-card-actions" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                  <button onClick={(e) => { e.stopPropagation(); handleEditClick(material); }} className="action-btn">Editar</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(material._id); }} className="action-btn danger">Excluir</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <button className="fab" aria-label="Adicionar Material" onClick={handleAddClick}>
          +
        </button>
      )}

      {isFormModalOpen && (
        <MaterialFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={editingMaterial}
        />
      )}

      {isDetailsModalOpen && viewingMaterial && (
        <MaterialDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          material={viewingMaterial}
        />
      )}
    </div>
  );
};
