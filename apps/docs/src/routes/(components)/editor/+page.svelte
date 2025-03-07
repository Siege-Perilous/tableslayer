<script lang="ts">
  import { Editor, CodeBlock } from '@tableslayer/ui';
  import { Example } from '$lib/components';
  import type { JSONContent } from '@tiptap/core';

  // Define the content as JSONContent
  let content: JSONContent = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'This editor is built using '
          },
          {
            type: 'text',
            marks: [
              {
                type: 'link',
                attrs: {
                  href: 'https://tiptap.dev/',
                  target: '_blank',
                  rel: 'noopener noreferrer nofollow'
                }
              }
            ],
            text: 'TipTap'
          },
          {
            type: 'text',
            text: '.'
          }
        ]
      },
      {
        type: 'paragraph'
      },
      {
        type: 'heading',
        attrs: {
          level: 3
        },
        content: [
          {
            type: 'text',
            text: 'Header example'
          }
        ]
      },
      {
        type: 'paragraph'
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'It allows the use of lists'
          }
        ]
      },
      {
        type: 'paragraph'
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Like this'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        type: 'paragraph'
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Or ordered lists'
          }
        ]
      },
      {
        type: 'paragraph'
      },
      {
        type: 'orderedList',
        attrs: {
          start: 1
        },
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Like'
                  }
                ]
              }
            ]
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'this one'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        type: 'paragraph'
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'We can also put a fancy quote:'
          }
        ]
      },
      {
        type: 'paragraph'
      },
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'But there is much beauty here, because there is much beauty everywhere.'
              },
              {
                type: 'hardBreak'
              },
              {
                type: 'hardBreak'
              },
              {
                type: 'text',
                text: '- Rainer Maria Rilke, Letters to a Young Poet'
              }
            ]
          }
        ]
      }
    ]
  };

  function handleUpdate(event) {
    content = event.detail;
  }
</script>

<Example title="Editor" propsName="Editor" layout="column">
  <Editor {content} height="300px" on:update={handleUpdate} />
</Example>
