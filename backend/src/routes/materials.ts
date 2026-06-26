import { Router } from 'express';
import Material from '../models/material';

const router = Router();

// GET all materials (public)
router.get('/', async (req, res) => {
  try {
    const materials = await Material.find().sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// GET a single material by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json(material);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

// POST - Create a new material
router.post('/', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    const material = new Material({ title, description });
    await material.save();
    res.status(201).json(material);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create material' });
  }
});

// PUT - Update a material
router.put('/:id', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    const updatedMaterial = await Material.findByIdAndUpdate(
      req.params.id,
      { title, description },
      { new: true, runValidators: true }
    );
    if (!updatedMaterial) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json(updatedMaterial);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update material' });
  }
});

// DELETE - Delete a material
router.delete('/:id', async (req, res) => {
  try {
    const deletedMaterial = await Material.findByIdAndDelete(req.params.id);
    if (!deletedMaterial) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json({ success: true, id: deletedMaterial._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

export default router;
