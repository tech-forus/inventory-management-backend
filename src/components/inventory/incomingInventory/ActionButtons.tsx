import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';

interface ActionButtonsProps {
  loading: boolean;
  isValid: boolean;
  hasItems: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  loading,
  isValid,
  hasItems,
  onSaveDraft,
  onSubmit,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-end gap-4">
      <button
        type="button"
        onClick={() => navigate('/app/inventory')}
        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSaveDraft}
        disabled={loading || !hasItems}
        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save as Draft
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || !hasItems || !isValid}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        title={!isValid && hasItems ? 'Please ensure all Total Quantity fields match their calculated sums' : ''}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Submitting...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Submit
          </>
        )}
      </button>
    </div>
  );
};

export default ActionButtons;
