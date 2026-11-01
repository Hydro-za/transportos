-- This installation serves exactly one business. A constant-expression unique index allows at most one organizations row.
create unique index organizations_single_business on public.organizations ((true));
