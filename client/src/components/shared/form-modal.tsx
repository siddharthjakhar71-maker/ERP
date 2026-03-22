import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FormModalProps {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export const FormModal = ({ open, title, description, onOpenChange, children }: FormModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
);
