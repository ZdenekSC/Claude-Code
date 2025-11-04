import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import type { Item } from '../types';

export function ItemManager() {
  const { project, addItem, updateItem, deleteItem } = useGameStore();
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const handleSave = (item: Item) => {
    if (editingItem) {
      updateItem(item.id, item);
    } else {
      addItem(item);
    }
    setShowDialog(false);
    setEditingItem(null);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setShowDialog(true);
  };

  const handleDelete = (itemId: string) => {
    if (window.confirm('Delete this item?')) {
      deleteItem(itemId);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Item Library</h3>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowDialog(true);
          }}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          + New Item
        </button>
      </div>

      <div className="space-y-2">
        {project.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
          >
            <div>
              <div className="font-semibold text-sm">{item.name}</div>
              <div className="text-xs text-gray-600">{item.description}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(item)}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {project.items.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            No items yet. Create one to get started!
          </div>
        )}
      </div>

      {showDialog && (
        <ItemDialog
          item={editingItem}
          onSave={handleSave}
          onCancel={() => {
            setShowDialog(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

function ItemDialog({
  item,
  onSave,
  onCancel,
}: {
  item: Item | null;
  onSave: (item: Item) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Item>(
    item || {
      id: `item-${Date.now()}`,
      name: '',
      description: '',
      iconUrl: '',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <h3 className="text-lg font-bold mb-4">{item ? 'Edit Item' : 'New Item'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded h-24"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Icon URL (optional)</label>
            <input
              type="text"
              value={formData.iconUrl || ''}
              onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              placeholder="https://..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
