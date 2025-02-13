<script lang="ts">
  import { Hr, Link, SelectorMenu, Spacer } from '@tableslayer/ui';
  import { Example } from '$lib/components';
  const menuItems = [
    {
      label: 'Party one',
      value: 'party1',
      href: '#party1'
    },
    {
      label: 'Party two',
      value: 'party2',
      href: '#party2'
    },
    {
      label: 'Party three',
      value: 'party3',
      href: '#party3'
    }
  ];
</script>

<Example title="SelectorMenu" propsName="SelectorMenu" layout="column">
  <SelectorMenu options={menuItems}>
    {#snippet footer({ footerProps })}
      <Spacer />
      <Hr />
      <div class="footer">
        <Link onclick={footerProps.close}>Footer stuff</Link>
      </div>
    {/snippet}
  </SelectorMenu>
</Example>

<style>
  .footer {
    padding: 1rem;
  }
</style>
