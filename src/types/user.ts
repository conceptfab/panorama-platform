export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  groupIds: string[];
}

export interface Group {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  projectIds: string[];
}

export interface AccessRule {
  id: string;
  pattern: string;
  isActive: boolean;
  createdAt: string;
  notes: string;
}

export interface AccessControl {
  whitelist: AccessRule[];
  blacklist: AccessRule[];
}

export interface UsersData {
  users: User[];
}

export interface GroupsData {
  groups: Group[];
}
