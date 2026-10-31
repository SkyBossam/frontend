import type { PageRegistry } from './pageTypes';
import { Welcome } from './pages/Welcome';
import { Auth } from './pages/Auth';
import { ChildSetup } from './pages/ChildSetup';
export const pages: PageRegistry = { Welcome, Auth, ChildSetup };
