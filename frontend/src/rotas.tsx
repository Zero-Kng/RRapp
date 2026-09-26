import { Route, Routes } from "react-router";
import { Layout } from "./layout/Layout";
import { Buscar } from "./paginas/Buscar";
import { Cadastro } from "./paginas/Cadastro";
import { Configuracoes } from "./paginas/Configuracoes";
import { Entrar } from "./paginas/Entrar";
import { EsqueciSenha } from "./paginas/EsqueciSenha";
import { Inicio } from "./paginas/Inicio";
import { NaoEncontrada } from "./paginas/NaoEncontrada";
import { Perfil } from "./paginas/Perfil";
import { RedefinirSenha } from "./paginas/RedefinirSenha";
import { Restaurante } from "./paginas/Restaurante";
import { Termos } from "./paginas/Termos";
import { RotaProtegida } from "./sessao/RotaProtegida";

export function Rotas() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="buscar" element={<Buscar />} />
        <Route path="r/:slug" element={<Restaurante />} />
        <Route path="u/:username" element={<Perfil />} />
        <Route
          path="configuracoes"
          element={
            <RotaProtegida>
              <Configuracoes />
            </RotaProtegida>
          }
        />
        <Route path="entrar" element={<Entrar />} />
        <Route path="cadastro" element={<Cadastro />} />
        <Route path="esqueci-senha" element={<EsqueciSenha />} />
        <Route path="redefinir-senha" element={<RedefinirSenha />} />
        <Route path="termos" element={<Termos />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  );
}
