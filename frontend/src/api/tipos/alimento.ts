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
