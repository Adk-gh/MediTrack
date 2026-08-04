/* Wrap any value (e.g., search input) so that the expensive operation fires only after the user pauses.

const debouncedTerm = useDebounce(searchTerm, 300);
useEffect(() => {
  if (debouncedTerm) fetchPatients(debouncedTerm);
}, [debouncedTerm]); */