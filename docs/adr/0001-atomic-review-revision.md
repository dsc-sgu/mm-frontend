# Review публикуется атомарными Review Revisions

Teacher не публикует отдельные root comments «по одному», как «Add single comment» в GitHub. Все изменения Teacher'а — Grade, Overall Feedback и собственные root comments Line Comment Threads — копятся в Review Working Copy и становятся видимы Student'у одной Review Revision. Replies Student'а и Teachers, напротив, публикуются сразу, вне revisions и независимо от Review Lease. Так Student никогда не видит частично пересмотренную Review (новый comment рядом со старой Grade), у root comments один жизненный цикл до и после первой публикации, а публикация остаётся одной командой с одним idempotency key и одной проверкой base revision.

## Considered Options

- **Мгновенные root comments после первой публикации.** Сохраняет каждый comment сразу и не теряет длинную проверку при сбое вкладки, но показывает Student'у промежуточные состояния, даёт два жизненных цикла comments и множит конкурентные команды и сигналы Review Read State. Отвергнуто: целостность revision — fail-closed гарантия.
- **Replies внутри Working Copy.** Отвергнуто: публикация полной заменой перезаписывала бы reply Student'а, пришедший во время редактирования.

## Consequences

- Пока browser-local или server-side черновик не введён, неопубликованная Working Copy живёт только в памяти вкладки; от потери её защищает подтверждение при уходе. Надёжность длинной проверки решается восстановлением черновика, а не отказом от атомарности.
- Reply Teacher'а не создаёт revision, но делает Review непрочитанной для Student'а.
- Удаление root comment в новой revision оставляет пометку «Комментарий удалён», replies других авторов сохраняются.

Решение принято в [«Спроектировать Review → Grade → Student result vertical»](https://github.com/dsc-sgu/mm-frontend/issues/116).
