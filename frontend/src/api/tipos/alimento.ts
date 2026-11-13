/** Alimento cadastrado no restaurante. */
export type FoodItem = {
  id: number;
  nome: string;
  categoria: string;
  medida: string;
  restaurante: number;
};

/** Dados enviados para cadastrar um alimento. O restaurante é opcional para o superusuário. */
export type NovoAlimento = Pick<FoodItem, "nome" | "categoria" | "medida"> & {
  restaurante?: number;
};

/**
 * Categorias oferecidas no cadastro. O backend aceita texto livre (até 60 caracteres);
 * a lista só padroniza a escolha na tela. "Carnes", "Pescados" e "Hortifruti" mantêm
 * as cores dos cartões do Dashboard.
 */
export const CATEGORIAS_ALIMENTO = [
  "Carnes",
  "Aves",
  "Pescados",
  "Hortifruti",
  "Laticínios",
  "Ovos",
  "Grãos e cereais",
  "Massas e farinhas",
  "Secos e enlatados",
  "Óleos e gorduras",
  "Temperos e condimentos",
  "Molhos",
  "Padaria",
  "Congelados",
  "Bebidas",
  "Outros",
] as const;
