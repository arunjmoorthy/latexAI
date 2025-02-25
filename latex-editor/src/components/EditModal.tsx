import React, { useState, useEffect } from 'react';
import { 
  QueryInput, 
  ButtonGroup, 
  Button, 
  LoadingOverlay, 
  LoadingSpinner 
} from '../styles/StyledComponents';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (query: string) => Promise<void>;
  isLoading: boolean;
}

const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [query, setQuery] = useState('');

  // Reset query when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    await onSubmit(query);
  };

  return (
    <>
      {isLoading && (
        <LoadingOverlay>
          <LoadingSpinner />
        </LoadingOverlay>
      )}
      <h3>Edit Selected Text</h3>
      <QueryInput
        type="text"
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
        placeholder="What changes would you like to make to the selected text?"
        autoFocus
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          } else if (e.key === 'Escape') {
            onClose();
          }
        }}
      />
      <ButtonGroup>
        <Button 
          className="secondary" 
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          className="primary" 
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Applying...' : 'Apply Changes'}
        </Button>
      </ButtonGroup>
    </>
  );
};

export default EditModal; 