import React from 'react';
import { Plus } from 'lucide-react';

interface NewIssueButtonProps {
  onClick: () => void;
}

const NewIssueButton: React.FC<NewIssueButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors"
    >
      <Plus size={20} />
      <span>New Issue</span>
    </button>
  );
};

export default NewIssueButton;
