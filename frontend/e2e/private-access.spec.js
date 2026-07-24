const { test, expect } = require('@playwright/test');

test('protege a aplicação antes da autenticação', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', {
    name: 'Aprendizagem com acesso responsável.',
  })).toBeVisible();
  await expect(page.getByRole('button', {
    name: 'Entrar com acesso autorizado',
  })).toBeVisible();
  await expect(page.getByText('somente alunos e professores previamente autorizados')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);
});

test('mantém o portal utilizável em tela móvel', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Verificação exclusiva do projeto móvel.');
  await page.goto('/');

  const accessButton = page.getByRole('button', { name: 'Entrar com acesso autorizado' });
  await expect(accessButton).toBeInViewport();
  await expect(accessButton).toBeEnabled();
});
