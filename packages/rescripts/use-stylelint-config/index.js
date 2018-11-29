const {
  propEq,
  findIndex,
  lensPath,
  over,
  map,
  append,
  compose,
} = require('ramda')
const styleLint = require('styleLint')
const {resolveFromRootOrNodeModules} = require('@rescripts/utilities')

const postCSSLoaderPath = require.resolve('postcss-loader')
const isPostCSSLoader = propEq('loader', postCSSLoaderPath)
const getPostCSSPluginsLens = ({use}) => {
  const postCSSLoaderIndex = findIndex(isPostCSSLoader, use)
  return postCSSLoaderIndex >= 0
    ? lensPath(['use', postCSSLoaderIndex, 'options', 'plugins'])
    : false
}

const addStyleLintPluginToPostCSSLoaders = path =>
  over(
    lensPath(['module', 'rules', 2, 'oneOf']),
    map(oneOf => {
      try {
        const lens = getPostCSSPluginsLens(oneOf)
        return over(lens, fn => [...fn(), styleLint({configFile: path})], oneOf)
      } catch (e) {
        return oneOf
      }
    }),
  )

// bug in 'stylelint-custom-processor-loader' configPath resolution
const addStylelintCustomProcessorLoader = path =>
  over(
    lensPath(['module', 'rules', 1, 'use']),
    append({
      loader: require.resolve('stylelint-custom-processor-loader'),
      options: {
        configPath: null,
        emitWarning: true,
      },
    }),
  )

const formatTransformMap = {
  css: addStyleLintPluginToPostCSSLoaders,
  scss: addStyleLintPluginToPostCSSLoaders,
  js: addStylelintCustomProcessorLoader,
}

module.exports = ({path, formats}) => config => {
  const resolved = resolveFromRootOrNodeModules(path)
  const transforms = map(key => formatTransformMap[key](resolved), formats)
  const transform = compose(...transforms)
  return transform(config)
}
