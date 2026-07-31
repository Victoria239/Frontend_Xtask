/* ErrorBoundary — atrapa errores de render y muestra mensaje en vez de pantalla blanca */

import { Component, type ReactNode } from "react";
import { Box, Typography, Button } from "@mui/material";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    /* React 19 + MUI v5: si el error es el removeChild/insertBefore
       de transiciones de Dialog, recuperar silenciosamente */
    if (
      error?.message?.includes("removeChild") ||
      error?.message?.includes("insertBefore")
    ) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (
      error?.message?.includes("removeChild") ||
      error?.message?.includes("insertBefore")
    ) {
      console.warn("ErrorBoundary: error de DOM ignorado (React 19 + MUI v5)", error.message);
      this.setState({ hasError: false, error: null });
      return;
    }
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh" p={4}>
          <Typography variant="h5" fontWeight={700} mb={2}>
            Algo salió mal
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={1}>
            {this.state.error?.message}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            sx={{ mt: 2 }}
          >
            Recargar página
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
