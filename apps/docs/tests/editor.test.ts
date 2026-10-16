import { expect, test, type Locator, type Page } from '@playwright/test';

// The /editor docs page renders two editors (light + dark) bound to the same
// content. Every step drives the first one; the second proves external content
// updates propagate. Toolbar order: bold, italic, link, bullet, ordered, quote.
const TEXT = 'Hello world';

const setup = async (page: Page) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'warning' && m.text().includes('[tiptap warn]')) warnings.push(m.text());
  });
  await page.goto('/editor');
  const root = page.locator('.editor').first();
  const editor = root.locator('.tiptap');
  await expect(editor).toBeVisible();
  const toolbarBtn = (i: number) => root.locator('.editor__btn').nth(i);
  const linkPopover = page.locator('#editorLinkPortal .linkPopover:visible');
  const textOptions = root.locator('.editor__toolbarTextOptions');
  const typeFresh = async (text = TEXT, expected = text) => {
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(text);
    await expect(editor).toHaveText(expected);
  };
  // ProseMirror syncs the DOM selection asynchronously after clicks and
  // commands; keys sent before that sync are applied to the stale selection
  const settle = () => page.waitForTimeout(100);
  const selectAll = async () => {
    await editor.click();
    await settle();
    await page.keyboard.press('Control+a');
    await expect.poll(() => page.evaluate(() => window.getSelection()?.type)).toBe('Range');
    await settle();
  };
  const chooseTextType = async (label: string) => {
    if (!(await textOptions.isVisible())) {
      await root.locator('.editor__toolbarTrigger').click();
      await expect(textOptions).toBeVisible();
    }
    await textOptions.locator('button', { hasText: label }).click();
  };
  return {
    errors,
    warnings,
    root,
    editor,
    toolbarBtn,
    linkPopover,
    textOptions,
    typeFresh,
    selectAll,
    settle,
    chooseTextType
  };
};

const expectHtml = async (editor: Locator, pattern: RegExp) => {
  await expect.poll(() => editor.innerHTML()).toMatch(pattern);
};

test.describe('Editor', () => {
  test('typing updates the bound content and other bound editors without errors', async ({ page }) => {
    const { errors, warnings, editor, typeFresh } = await setup(page);
    await typeFresh();
    await expect(editor).toContainText(TEXT);
    await expect(page.getByTestId('editorContent')).toContainText(`"text":"${TEXT}"`);
    await expect(page.locator('.editor').nth(1).locator('.tiptap')).toContainText(TEXT);
    // A duplicated prosemirror-model or tiptap extension throws on every keystroke
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  test('bold and italic via toolbar and shortcuts', async ({ page }) => {
    const { editor, toolbarBtn, typeFresh, selectAll } = await setup(page);
    await typeFresh();
    await selectAll();
    await toolbarBtn(0).click();
    await expectHtml(editor, /<strong>Hello world<\/strong>/);
    await expect(toolbarBtn(0)).toHaveClass(/isActive/);
    await toolbarBtn(0).click();
    await expectHtml(editor, /^<p>Hello world<\/p>$/);

    await selectAll();
    await toolbarBtn(1).click();
    await expectHtml(editor, /<em>Hello world<\/em>/);
    await expect(toolbarBtn(1)).toHaveClass(/isActive/);
    await toolbarBtn(1).click();
    await expectHtml(editor, /^<p>Hello world<\/p>$/);

    await selectAll();
    await page.keyboard.press('Control+b');
    await expectHtml(editor, /<strong>Hello world<\/strong>/);
    await page.keyboard.press('Control+i');
    await expectHtml(editor, /<em>Hello world<\/em>/);
  });

  test('lists and blockquote via toolbar', async ({ page }) => {
    const { editor, toolbarBtn, typeFresh, selectAll } = await setup(page);
    await typeFresh();
    await selectAll();
    await toolbarBtn(3).click();
    await expectHtml(editor, /^<ul><li><p>Hello world<\/p><\/li><\/ul>/);
    // Active state is reported for a caret inside the block
    await editor.locator('li p').click();
    await expect(toolbarBtn(3)).toHaveClass(/isActive/);
    await toolbarBtn(3).click();
    await expectHtml(editor, /^<p>Hello world<\/p>/);

    await typeFresh();
    await selectAll();
    await toolbarBtn(4).click();
    await expectHtml(editor, /^<ol[^>]*><li><p>Hello world<\/p><\/li><\/ol>/);
    await editor.locator('li p').click();
    await expect(toolbarBtn(4)).toHaveClass(/isActive/);
    await toolbarBtn(4).click();
    await expectHtml(editor, /^<p>Hello world<\/p>/);

    await typeFresh();
    await selectAll();
    await toolbarBtn(5).click();
    await expectHtml(editor, /^<blockquote><p>Hello world<\/p><\/blockquote>/);
    await editor.locator('blockquote p').click();
    await expect(toolbarBtn(5)).toHaveClass(/isActive/);
    await toolbarBtn(5).click();
    await expectHtml(editor, /^<p>Hello world<\/p>/);
  });

  test('text size popover switches headings and reflects the active type', async ({ page }) => {
    const { root, editor, textOptions, typeFresh, chooseTextType } = await setup(page);
    await typeFresh();
    for (const [label, tag] of [
      ['Huge', 'h1'],
      ['Large', 'h2'],
      ['Medium', 'h3'],
      ['Normal', 'p']
    ]) {
      await chooseTextType(label);
      await expectHtml(editor, new RegExp(`^<${tag}>Hello world</${tag}>`));
      await expect(root.locator('.editor__toolbarTrigger')).toContainText(label);
    }
    // Popovers close on any click outside them
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await expect(textOptions).toBeHidden();
  });

  test('markdown input rules and typography', async ({ page }) => {
    const { editor, typeFresh } = await setup(page);
    await typeFresh('# Title', 'Title');
    await expectHtml(editor, /^<h1>Title<\/h1>/);
    await page.keyboard.press('Enter');
    await page.keyboard.type('- item');
    await expectHtml(editor, /<ul><li><p>item<\/p><\/li><\/ul>/);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('**bold** ');
    await expectHtml(editor, /<strong>bold<\/strong>/);
    await page.keyboard.type('a -- b');
    await expectHtml(editor, /a — b/);
  });

  test('undo and redo', async ({ page }) => {
    const { editor, typeFresh } = await setup(page);
    await typeFresh();
    await page.keyboard.press('Enter');
    await page.keyboard.type('undo me');
    await expect(editor).toContainText('undo me');
    await page.keyboard.press('Control+z');
    await expect(editor).not.toContainText('undo me');
    await page.keyboard.press('Control+Shift+z');
    await expect(editor).toContainText('undo me');
  });

  test('link on a selection: create, edit, visit guard, remove', async ({ page }) => {
    const { editor, toolbarBtn, linkPopover, typeFresh, selectAll } = await setup(page);
    await typeFresh();
    await selectAll();
    await toolbarBtn(2).click();
    await expect(linkPopover).toBeVisible();
    const input = linkPopover.locator('input');
    await expect(input).toBeFocused();
    await input.fill('https://example.com');
    await input.press('Enter');
    await expect(linkPopover).toBeHidden();
    await expectHtml(editor, /<a[^>]*class="editor-link"[^>]*href="https:\/\/example\.com"[^>]*>Hello world<\/a>/);
    await expect(toolbarBtn(2)).toHaveClass(/isActive/);

    // Clicking a link opens the popover instead of navigating
    await editor.locator('a').first().click();
    await expect(linkPopover).toBeVisible();
    expect(page.context().pages()).toHaveLength(1);
    await expect(input).toHaveValue('https://example.com');
    await input.fill('https://tableslayer.com');
    await linkPopover.locator('.linkPopover__inputRow button').click();
    await expectHtml(editor, /href="https:\/\/tableslayer\.com"/);

    await editor.locator('a').first().click();
    await expect(linkPopover).toBeVisible();
    await linkPopover.locator('button', { hasText: 'Remove' }).click();
    await expectHtml(editor, /^<p>Hello world<\/p>/);
    await expect(editor.locator('a')).toHaveCount(0);
  });

  test('link with an empty url is removed; link without selection inserts placeholder text', async ({ page }) => {
    const { editor, toolbarBtn, linkPopover, typeFresh, selectAll } = await setup(page);
    await typeFresh();
    await selectAll();
    await toolbarBtn(2).click();
    await expect(linkPopover).toBeVisible();
    await linkPopover.locator('input').fill('https://check.example');
    await linkPopover.locator('input').press('Enter');
    await expectHtml(editor, /href="https:\/\/check\.example"/);
    await editor.locator('a').first().click();
    await expect(linkPopover).toBeVisible();
    await linkPopover.locator('input').fill('');
    await linkPopover.locator('input').press('Enter');
    await expect(editor.locator('a')).toHaveCount(0);

    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await toolbarBtn(2).click();
    await expect(linkPopover).toBeVisible();
    await expectHtml(editor, /<a[^>]*>link<\/a>/);
    await linkPopover.locator('input').fill('https://placeholder.example');
    await linkPopover.locator('input').press('Enter');
    await expectHtml(editor, /href="https:\/\/placeholder\.example"[^>]*>link<\/a>/);
  });

  test('typed urls are autolinked', async ({ page }) => {
    const { editor, typeFresh } = await setup(page);
    await typeFresh('see https://auto.example/x ');
    await expectHtml(editor, /<a[^>]*href="https:\/\/auto\.example\/x"[^>]*>https:\/\/auto\.example\/x<\/a>/);
  });
});
