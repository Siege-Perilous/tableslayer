<script>
  import jsonData from '../../../../typedocgen.json';
  import Markdown from '@magidoc/plugin-svelte-marked';
  import { Table, Th, Td, Title, Spacer } from '@tableslayer/ui';
  export let componentName = '';

  const getComponentData = (componentName) => {
    const component = jsonData.children.find(
      (child) => child.name === componentName && child.variant === 'declaration'
    );

    if (!component) return null;

    const props = jsonData.children.find((child) => child.name === `${componentName}Props`);

    return props?.type ?? null;
  };

  const getPropsList = (type) => {
    if (type?.type === 'intersection') {
      // Handle intersection types (e.g., ButtonProps extending HTMLButtonAttributes)
      return type.types?.filter((t) => t.type === 'reflection').flatMap((t) => t.declaration.children) || [];
    }
    if (type?.type === 'reflection') {
      // Handle reflection types (e.g., ToolTipProps)
      return type.declaration.children || [];
    }
    return [];
  };

  const getExtendedProps = (type) => {
    if (type?.type === 'intersection') {
      return (
        type.types
          ?.filter((t) => t.type === 'reference')
          ?.map((t) => `${t.name}`)
          .join(', ') || ''
      );
    }
    return '';
  };

  const getComment = (prop) => {
    return prop?.comment?.summary?.map((s) => s.text).join(' ') || '';
  };

  const getDefaultValue = (prop) => {
    const defaultTag = prop?.comment?.blockTags?.find((tag) => tag.tag === '@default');
    return defaultTag ? defaultTag.content[0]?.text || '' : '';
  };

  const componentType = getComponentData(componentName);
  const extendedProps = getExtendedProps(componentType);
  const propsList = getPropsList(componentType);
</script>

{#if componentType}
  <Title as="h3" size="sm">{componentName} Properties</Title>
  <Spacer size={2} />

  {#if extendedProps}
    <p>
      <strong>Extends:</strong>
      {extendedProps}
    </p>
    <Spacer />
  {/if}

  <Table>
    <thead>
      <tr>
        <Th>Property</Th>
        <Th>Type</Th>
        <Th>Description</Th>
        <Th>Default</Th>
      </tr>
    </thead>
    <tbody>
      {#each propsList as prop}
        <tr>
          <Td>
            <strong>
              {prop.name}
              {#if !prop.flags.isOptional}
                *
              {/if}
            </strong>
          </Td>
          <Td>
            {#if prop.type.type === 'intrinsic'}
              {prop.type.name}
            {/if}
            {#if prop.type.type === 'union'}
              {prop.type.types.map((type) => type.value || type.name).join(' | ')}
            {:else if prop.type.type === 'reference'}
              {prop.type.name}
            {/if}
          </Td>
          <Td><Markdown source={getComment(prop)} /></Td>
          <Td><Markdown source={getDefaultValue(prop)} /></Td>
        </tr>
      {/each}
    </tbody>
  </Table>
{:else}
  <p>No data available for {componentName}.</p>
{/if}
