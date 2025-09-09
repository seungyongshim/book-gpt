module.exports = {
    extends: [
        'stylelint-config-standard-scss',
        'stylelint-config-prettier-scss',
    ],
    plugins: ['stylelint-order'],
    customSyntax: 'postcss-scss',
    rules: {
        // Relax ordering to avoid massive non-functional diffs during cleanup
        'order/properties-order': null,
        'declaration-empty-line-before': null,
        'selector-class-pattern': [
            '^[a-z]([a-z0-9-]*[a-z0-9])?(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$',
            {
                resolveNestedSelectors: true,
                message: '클래스는 kebab-case, BEM(__, --) 패턴을 권장합니다.'
            }
        ],
        'color-function-notation': null,
        'alpha-value-notation': 'number',
        'function-url-quotes': null,
        'value-keyword-case': null,
        'declaration-block-no-redundant-longhand-properties': null,
        'declaration-block-no-duplicate-properties': null,
        'no-descending-specificity': null,
        'keyframes-name-pattern': null,
        'property-no-vendor-prefix': null,
        'media-feature-name-no-unknown': null,
        'media-feature-range-notation': null,
        'media-feature-name-no-vendor-prefix': null,
        'selector-no-vendor-prefix': null,
        'rule-empty-line-before': null,
        'scss/double-slash-comment-empty-line-before': null,
        'scss/at-mixin-argumentless-call-parentheses': null,
        'shorthand-property-no-redundant-values': null,
        'color-hex-length': null,
        'font-family-name-quotes': null,
        'unit-no-unknown': null,
        'no-duplicate-selectors': null,
        'scss/at-extend-no-missing-placeholder': true,
        'scss/dollar-variable-pattern': '^[a-z0-9-]+$',
        'scss/dollar-variable-empty-line-before': null,
    }
}
