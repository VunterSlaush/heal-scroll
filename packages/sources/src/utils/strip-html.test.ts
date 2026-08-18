import { describe, expect, it } from 'vitest';
import { stripHtml } from './strip-html';

describe('stripHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripHtml('<p class="x">\n\n</p>\n<p><b>Space</b> is   big.</p>')).toBe('Space is big.');
  });

  it('drops script and style blocks entirely', () => {
    expect(stripHtml('a<script>alert(1)</script>b<style>p{}</style>c')).toBe('a b c');
  });

  it('decodes numeric and named entities', () => {
    expect(stripHtml('caf&#233; &amp; bar&#x2014;ok&nbsp;&hellip;')).toBe('café & bar—ok …');
  });

  it('leaves unknown entities untouched', () => {
    expect(stripHtml('&notarealentity;')).toBe('&notarealentity;');
  });
});
