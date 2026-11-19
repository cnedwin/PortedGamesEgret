// 立绘部件清单的总目录。新增角色在这里加一行，预览页和导出脚本都跟着认。
import { fire } from './fire.mjs';

export const portraits = [fire];

export const portraitById = (id) => portraits.find((portrait) => portrait.id === id) ?? null;

export const defaultPortrait = portraits[0];
