import { useState } from "react";
import { aplicarTema, lerTema, type Tema } from "./tema";

const OPCOES: { valor: Tema; rotulo: string }[] = [
  { valor: "sistema", rotulo: "Seguir o sistema" },
  { valor: "claro", rotulo: "Claro" },
  { valor: "escuro", rotulo: "Escuro" },
];

export function SeletorTema() {
  const [tema, setTema] = useState<Tema>(lerTema);

  function escolher(novo: Tema) {
    aplicarTema(novo);
    setTema(novo);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">Tema</legend>
      {OPCOES.map(({ valor, rotulo }) => (
        <label key={valor} className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="tema"
            value={valor}
            checked={tema === valor}
            onChange={() => escolher(valor)}
            className="accent-destaque"
          />
          {rotulo}
        </label>
      ))}
    </fieldset>
  );
}
