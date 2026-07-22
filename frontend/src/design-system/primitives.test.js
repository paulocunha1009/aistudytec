import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, ErrorState, Input, Progress, Skeleton, ToastRegion } from './index';

test('Button expõe estado de carregamento e bloqueia interação', () => {
  const html = renderToStaticMarkup(<Button loading>Salvar</Button>);
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain('disabled');
  expect(html).toContain('type="button"');
});

test('Input conecta rótulo, ajuda e estado inválido', () => {
  const html = renderToStaticMarkup(<Input id="email" label="E-mail" error="Informe um e-mail válido" />);
  expect(html).toContain('for="email"');
  expect(html).toContain('aria-invalid="true"');
  expect(html).toContain('aria-describedby="email-description"');
});

test('Progress limita valores e publica semântica acessível', () => {
  const html = renderToStaticMarkup(<Progress value={120} label="Lição" />);
  expect(html).toContain('role="progressbar"');
  expect(html).toContain('aria-valuenow="100"');
  expect(html).toContain('100%');
});

test('Badge aplica o tom solicitado', () => {
  const html = renderToStaticMarkup(<Badge tone="success">Concluído</Badge>);
  expect(html).toContain('bg-emerald-100');
  expect(html).toContain('Concluído');
});

test('Dialog publica título, descrição e modalidade', () => {
  const html = renderToStaticMarkup(<Dialog open title="Nova turma" description="Preencha os dados" onClose={() => {}}>Conteúdo</Dialog>);
  expect(html).toContain('role="dialog"');
  expect(html).toContain('aria-modal="true"');
  expect(html).toContain('Nova turma');
});

test('Toast diferencia erro assertivo de informação', () => {
  const html = renderToStaticMarkup(<ToastRegion toasts={[{ id: 1, type: 'error', message: 'Falhou' }]} onDismiss={() => {}} />);
  expect(html).toContain('role="alert"');
  expect(html).toContain('aria-live="assertive"');
  expect(html).toContain('Fechar notificação');
});

test('Skeleton comunica carregamento sem expor decoração', () => {
  const html = renderToStaticMarkup(<Skeleton lines={2} label="Carregando turma" />);
  expect(html).toContain('role="status"');
  expect(html).toContain('Carregando turma');
  expect((html.match(/aria-hidden="true"/g) || []).length).toBe(2);
});

test('Estados vazio e erro apresentam orientação acionável', () => {
  const empty = renderToStaticMarkup(<EmptyState title="Nenhuma turma" description="Crie a primeira turma." />);
  const error = renderToStaticMarkup(<ErrorState message="Falha de rede" onRetry={() => {}} />);
  expect(empty).toContain('Nenhuma turma');
  expect(error).toContain('role="alert"');
  expect(error).toContain('Tentar novamente');
});

test('ConfirmDialog exige uma ação explícita', () => {
  const html = renderToStaticMarkup(<ConfirmDialog open title="Excluir?" description="Não pode ser desfeito." onConfirm={() => {}} onCancel={() => {}} />);
  expect(html).toContain('Excluir?');
  expect(html).toContain('Confirmar');
  expect(html).toContain('Cancelar');
});
