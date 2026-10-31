import type { PageRegistry } from './pageTypes';
import { Welcome } from './pages/Welcome';
import { Auth } from './pages/Auth';
import { ChildSetup } from './pages/ChildSetup';
import { AlertSetup } from './pages/AlertSetup';
import { Dashboard } from './pages/Dashboard';
export const pages: PageRegistry = { Welcome, Auth, ChildSetup, AlertSetup, Dashboard };
