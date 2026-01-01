import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { IncomingInventoryFormData } from './types';

interface AdditionalDetailsSectionProps {
  formData: IncomingInventoryFormData;
  teams: any[];
  onFormDataChange: (updates: Partial<IncomingInventoryFormData>) => void;
}

const AdditionalDetailsSection: React.FC<AdditionalDetailsSectionProps> = ({
  formData,
  teams,
  onFormDataChange,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Details <span className="text-red-500">*</span></h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Received By <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            <select
              value={formData.receivedBy}
              onChange={(e) => onFormDataChange({ receivedBy: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Team from Library</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => navigate('/app/library?tab=teams')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea
            value={formData.remarks}
            onChange={(e) => onFormDataChange({ remarks: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter any additional remarks"
          />
        </div>
      </div>
    </div>
  );
};

export default AdditionalDetailsSection;
