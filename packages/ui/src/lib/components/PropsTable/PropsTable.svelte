<script>
  import jsonData from '../../../../typedocgen.json';
  export let componentName = '';
  const getComponentData = (componentName) => {
    const component = jsonData.children.find(
      (child) => child.name === componentName && child.variant === 'declaration'
    );

    if (!component) return null;

    const props = jsonData.children.find((child) => child.name === `${componentName}Props`);

    return props?.type.types[0]?.declaration?.children ?? [];
  };

  const componentData = getComponentData(componentName);

  // Function to get the comment summary for a prop
  const getComment = (prop) => {
    return prop?.comment?.summary?.map((s) => s.text).join(' ') || '';
  };

  // Function to get the default value for a prop
  const getDefaultValue = (prop) => {
    const defaultTag = prop?.comment?.blockTags?.find((tag) => tag.tag === '@default');
    return defaultTag ? defaultTag.content[0]?.text || 'N/A' : 'N/A';
  };

  // Function to get extended props
  const getExtendedProps = (prop) => {
    return (
      prop?.type?.types
        ?.filter((t) => t.type === 'reference')
        ?.map((t) => t.name)
        .join(', ') || ''
    );
  };
</script>

{#if componentData}
  <h2>{componentName} Properties</h2>
  <ul>
    {#each componentData as prop}
      <li>
        <strong>{prop.name}</strong>:
        {#if prop.type.type === 'intrinsic'}
          {prop.type.name}
        {/if}
        {#if prop.type.type === 'union'}
          {prop.type.types.map((type) => type.value).join(' | ')}
        {:else if prop.type.type === 'reference'}
          {prop.type.name}
        {/if}
        {#if prop.flags.isOptional}
          (optional)
        {/if}
        {getComment(prop)}
        {getDefaultValue(prop)}
        {getExtendedProps(prop)}
      </li>
    {/each}
  </ul>
{:else}
  <p>No data available for {componentName}.</p>
{/if}
