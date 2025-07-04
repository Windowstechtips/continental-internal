declare module '@headlessui/react' {
  import { ComponentType, ReactNode } from 'react';

  export interface DialogProps {
    as?: React.ElementType;
    open?: boolean;
    onClose: (value: boolean) => void;
    children?: ReactNode;
    className?: string;
  }

  export interface DialogTitleProps {
    as?: React.ElementType;
    className?: string;
    children?: ReactNode;
  }

  export interface DialogOverlayProps {
    className?: string;
    children?: ReactNode;
  }

  export interface TransitionProps {
    as?: React.ElementType;
    show?: boolean;
    appear?: boolean;
    unmount?: boolean;
    className?: string;
    children?: ReactNode;
  }

  export interface TransitionChildProps {
    as?: React.ElementType;
    appear?: boolean;
    unmount?: boolean;
    className?: string;
    enter?: string;
    enterFrom?: string;
    enterTo?: string;
    leave?: string;
    leaveFrom?: string;
    leaveTo?: string;
    children?: ReactNode;
  }

  export interface MenuProps {
    as?: React.ElementType;
    className?: string;
    children?: ReactNode;
  }

  export interface MenuButtonProps {
    as?: React.ElementType;
    className?: string;
    children?: ReactNode;
  }

  export interface MenuItemsProps {
    as?: React.ElementType;
    className?: string;
    children?: ReactNode;
  }

  export interface MenuItemProps {
    as?: React.ElementType;
    className?: string;
    children?: ReactNode | ((props: { active: boolean }) => ReactNode);
  }

  export const Dialog: ComponentType<DialogProps> & {
    Title: ComponentType<DialogTitleProps>;
    Description: ComponentType<any>;
    Overlay: ComponentType<DialogOverlayProps>;
    Panel: ComponentType<any>;
  };

  export const Transition: ComponentType<TransitionProps> & {
    Child: ComponentType<TransitionChildProps>;
  };

  export const Menu: ComponentType<MenuProps> & {
    Button: ComponentType<MenuButtonProps>;
    Items: ComponentType<MenuItemsProps>;
    Item: ComponentType<MenuItemProps>;
  };
} 