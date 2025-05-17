declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';
  
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    stroke?: string | number;
  }
  
  type Icon = ComponentType<IconProps>;
  
  export const Calendar: Icon;
  export const Clock: Icon;
  export const Filter: Icon;
  export const Search: Icon;
  export const Edit: Icon;
  export const X: Icon;
  export const AlertCircle: Icon;
  export const CheckCircle: Icon;
  export const ChevronDown: Icon;
  export const ChevronUp: Icon;
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const Plus: Icon;
  export const Trash: Icon;
  export const Settings: Icon;
  export const User: Icon;
  export const LogOut: Icon;
  export const Home: Icon;
  export const Book: Icon;
  export const BookOpen: Icon;
  export const Clipboard: Icon;
  export const ClipboardList: Icon;
  export const Copy: Icon;
  export const Download: Icon;
  export const Upload: Icon;
  export const Eye: Icon;
  export const EyeOff: Icon;
  export const File: Icon;
  export const FileText: Icon;
  export const Folder: Icon;
  export const FolderOpen: Icon;
  export const HelpCircle: Icon;
  export const Info: Icon;
  export const Link: Icon;
  export const Mail: Icon;
  export const Menu: Icon;
  export const MessageSquare: Icon;
  export const MoreHorizontal: Icon;
  export const MoreVertical: Icon;
  export const Paperclip: Icon;
  export const Pencil: Icon;
  export const RefreshCw: Icon;
  export const Save: Icon;
  export const Send: Icon;
  export const Share: Icon;
  export const Slash: Icon;
  export const Star: Icon;
  export const Sun: Icon;
  export const Moon: Icon;
  export const Trash2: Icon;
  export const Type: Icon;
  export const Unlock: Icon;
  export const Lock: Icon;
  export const Users: Icon;
  export const Zap: Icon;
  export const ZapOff: Icon;
}
