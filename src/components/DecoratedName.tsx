import { FC, ReactNode } from 'react';
import { ProfileDecorations } from '../types';
import { getDecoratedNameClasses } from '../utils/decorations';

interface DecoratedNameProps {
  name: string;
  decorations?: ProfileDecorations;
  className?: string;
  onCustomBg?: boolean;
  children?: ReactNode;
}

export const DecoratedName: FC<DecoratedNameProps> = ({
  name,
  decorations,
  className = '',
  onCustomBg,
  children,
}) => {
  const isCustomBg = onCustomBg ?? Boolean(decorations?.backgroundValue);
  const decoClasses = getDecoratedNameClasses(decorations, isCustomBg);

  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${decoClasses} ${className}`}>
      <span>{name}</span>
      {children}
    </span>
  );
};
