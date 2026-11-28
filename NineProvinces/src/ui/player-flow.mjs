// Copy for the native save and progress confirmation sheets.
import { pair } from './text.mjs';

export const progressPrompt = reason => reason === 'overwrite'
  ? {
      title: pair(['覆盖这个存档？', 'Replace this save?']),
      text: pair(['这个手动档位已有一局记录。覆盖只影响该档位，其他档位和自动存档不变。', 'This manual slot already contains a campaign. Only this slot will be replaced; other slots and the autosave stay unchanged.']),
      action: pair(['确认覆盖', 'Replace save'])
    }
  : {
      title: pair(['还有尚未保存的进展', 'You have unsaved progress']),
      text: pair(['从上次成功保存起，局势或命令已经改变。可以先返回存档，或放弃这段进展继续。镜头、选中与设置变化不会触发此提示。', 'The campaign has changed since the last successful save. Return to save it, or continue and discard those changes. Camera, selection and settings alone never trigger this warning.']),
      action: pair(['放弃进展并继续', 'Discard progress and continue'])
    };
