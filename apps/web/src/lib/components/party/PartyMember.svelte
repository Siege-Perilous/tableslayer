<script lang="ts">
  import { CldImage } from 'svelte-cloudinary';
  import type { SelectUser } from '$lib/db/schema';
  import { type PartyRole } from '$lib/db/schema';

  type PartyMemberProps = SelectUser & {
    role: PartyRole;
  };

  let { member }: { member: PartyMemberProps } = $props();
</script>

<CldImage src={member.avatar} width={40} height={40} />
<p>{member.email} - {member.role}</p>
