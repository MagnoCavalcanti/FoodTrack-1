import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  ApiError,
  createFood,
  formatQuantity,
  localDateString,
  login,
  mascararCnpj,
  MOTIVOS_DESPERDICIO,
  rotuloDe,
} from "../src/api.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("mascararCnpj formata e limita os dígitos do CNPJ", () => {
  assert.equal(mascararCnpj("11.222.333/0001-81"), "11.222.333/0001-81");
  assert.equal(mascararCnpj("123"), "12.3");
  assert.equal(mascararCnpj("11.222.333/0001-81999"), "11.222.333/0001-81");
});

test("formatQuantity formata números e preserva valores inválidos", () => {
  assert.equal(formatQuantity("1234.5"), "1.234,5");
  assert.equal(formatQuantity("inválido"), "inválido");
});

test("localDateString usa o formato local AAAA-MM-DD", () => {
  assert.equal(localDateString(new Date(2026, 0, 5)), "2026-01-05");
});

test("rotuloDe retorna o rótulo conhecido ou o valor original", () => {
  assert.equal(rotuloDe(MOTIVOS_DESPERDICIO, "outro"), "Outro");
  assert.equal(rotuloDe(MOTIVOS_DESPERDICIO, "personalizado"), "personalizado");
});

test("login envia as credenciais e retorna o token da API", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "/api/token/");
    assert.equal(init?.method, "POST");
    assert.equal(init?.headers && new Headers(init.headers).get("Content-Type"), "application/json");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      username: "ana",
      password: "senha-teste",
    });
    return Response.json({ token: "token-teste" });
  };

  assert.deepEqual(await login("ana", "senha-teste"), { token: "token-teste" });
});

test("createFood envia token de autenticação e os dados do alimento", async () => {
  const food = { id: 7, nome: "Arroz", categoria: "Grãos", medida: "kg", restaurante: 2 };
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "/api/alimentos/");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Token token-teste");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      nome: "Arroz",
      categoria: "Grãos",
      medida: "kg",
    });
    return Response.json(food);
  };

  assert.deepEqual(await createFood("token-teste", {
    nome: "Arroz",
    categoria: "Grãos",
    medida: "kg",
  }), food);
});

test("login converte respostas de erro da API em ApiError", async () => {
  globalThis.fetch = async () => Response.json(
    { detail: "Credenciais inválidas." },
    { status: 401 },
  );

  await assert.rejects(login("ana", "incorreta"), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 401);
    assert.equal(error.message, "Credenciais inválidas.");
    return true;
  });
});

test("login converte falhas de rede em ApiError com status zero", async () => {
  globalThis.fetch = async () => {
    throw new Error("Conexão recusada");
  };

  await assert.rejects(login("ana", "senha-teste"), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 0);
    return true;
  });
});
