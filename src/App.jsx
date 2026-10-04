import UIProvider from "./context/UIProvider.jsx";
import AuthProvider from "./context/AuthProvider.jsx";
import SettingsProvider from "./context/SettingsProvider.jsx";
import DataProvider from "./context/DataProvider.jsx";
import AppRoutes from "./routes.jsx";

export default function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <SettingsProvider>
          <DataProvider>
            <AppRoutes />
          </DataProvider>
        </SettingsProvider>
      </AuthProvider>
    </UIProvider>
  );
}
