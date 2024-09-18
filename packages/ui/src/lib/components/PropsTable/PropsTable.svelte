<script>
  import jsonData from '../../../../typedocgen.json';
  import Markdown from '@magidoc/plugin-svelte-marked';
  export let componentName = '';

  // Function to get component data (props)
  const getComponentData = (componentName) => {
    const component = jsonData.children.find(
      (child) => child.name === componentName && child.variant === 'declaration'
    );

    if (!component) return null;

    const props = jsonData.children.find((child) => child.name === `${componentName}Props`);

    return props?.type ?? null;
  };

  // Function to get the props list for reflection types
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

  // Function to extract extended types (e.g., HTMLButtonAttributes) from intersection types
  const getExtendedProps = (type) => {
    if (type?.type === 'intersection') {
      return (
        type.types
          ?.filter((t) => t.type === 'reference')
          ?.map((t) => `${t.name}`) // You can use t.qualifiedName if needed
          .join(', ') || ''
      );
    }
    return '';
  };

  // Function to get the comment summary for a prop
  const getComment = (prop) => {
    return prop?.comment?.summary?.map((s) => s.text).join(' ') || '';
  };

  // Function to get the default value for a prop
  const getDefaultValue = (prop) => {
    const defaultTag = prop?.comment?.blockTags?.find((tag) => tag.tag === '@default');
    return defaultTag ? defaultTag.content[0]?.text || '' : '';
  };

  // Fetch component data
  const componentType = getComponentData(componentName);
  const extendedProps = getExtendedProps(componentType);
  const propsList = getPropsList(componentType);
</script>

{#if componentType}
  <h2>{componentName} Properties</h2>

  {#if extendedProps}
    <p><strong>Extends:</strong> {extendedProps}</p>
  {/if}

  <table>
    <thead>
      <tr>
        <th>Property</th>
        <th>Type</th>
        <th>Description</th>
        <th>Default</th>
      </tr>
    </thead>
    <tbody>
      {#each propsList as prop}
        <tr>
          <td>
            <strong>
              {prop.name}
              {#if !prop.flags.isOptional}
                *
              {/if}
            </strong>
          </td>
          <td>
            {#if prop.type.type === 'intrinsic'}
              {prop.type.name}
            {/if}
            {#if prop.type.type === 'union'}
              {prop.type.types.map((type) => type.value || type.name).join(' | ')}
            {:else if prop.type.type === 'reference'}
              {prop.type.name}
            {/if}
          </td>
          <td><Markdown source={getComment(prop)} /></td>
          <td><Markdown source={getDefaultValue(prop)} /></td>
        </tr>
      {/each}
    </tbody>
  </table>
{:else}
  <p>No data available for {componentName}.</p>
{/if}
