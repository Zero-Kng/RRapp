import { Link } from "react-router";
import { useTitulo } from "../util/titulo";

export function NaoEncontrada() {
  useTitulo("Página não encontrada");
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Página não encontrada</h1>
      <p className="mt-2 text-texto-secundario">
        O endereço pode ter mudado, ou o restaurante ou perfil não existe mais.
      </p>
      <Link to="/" className="mt-6 inline-block font-semibold text-destaque hover:underline">
        Voltar para o início
      </Link>
    </div>
  );
}
