import React, { useEffect, useRef, useState } from 'react';

const ROLES = ['M.C.', 'C.A.', 'C.L.', 'C.D.'];

interface RoleMultiSelectProps {
  selectedRoles: string[];
  onChange: (selected: string[]) => void;
}

export default function RoleMultiSelect({ selectedRoles, onChange }: RoleMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const toggleRole = (role: string) => {
    const newRoles = selectedRoles.includes(role)
      ? selectedRoles.filter(r => r !== role)
      : [...selectedRoles, role];
    onChange(newRoles);
  };

  const selectedText = selectedRoles.length > 0 ? selectedRoles.join(', ') : 'Selecionar...';

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={ref}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '4px 8px',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          userSelect: 'none',
          fontSize: '0.875rem',
        }}
      >
        {selectedText}
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            zIndex: 10,
            marginTop: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {ROLES.map(role => (
            <label
              key={role}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              <input
                type="checkbox"
                checked={selectedRoles.includes(role)}
                onChange={() => toggleRole(role)}
              />
              <span>{role}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
