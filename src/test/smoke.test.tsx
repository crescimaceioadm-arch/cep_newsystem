import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Teste simples de exemplo
describe("Smoke Test", () => {
  it("deve renderizar sem crashar", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div>App carregado</div>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("App carregado")).toBeInTheDocument();
  });
});
