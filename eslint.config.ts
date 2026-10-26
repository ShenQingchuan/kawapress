import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  ignores: [
    // The benchmark writes throwaway sites and reports into the repo.
    'bench/.sites/**',
  ],
})
