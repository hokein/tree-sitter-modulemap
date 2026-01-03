// Reference: https://clang.llvm.org/docs/Modules.html#module-map-language

export default grammar({
  name: 'modulemap',

  extras: $ => [
    /\s/,
    $.comment,
  ],

  // Optimize for keyword matching
  word: $ => $.identifier,

  rules: {
    source_file: $ => repeat($._module_declaration),

    // -- Top Level Declarations --
    _module_declaration: $ => choice(
      $.module_declaration,
      $.extern_module_declaration
    ),

    // module std [system] { ... }
    module_declaration: $ => seq(
      optional('explicit'),
      optional('framework'),
      'module',
      field('name', $.module_id), // '*' used for inferred submodules
      field('attributes', optional($.attributes)),
      field('body', $.module_body)
    ),

    // extern module MyModule "path/to/file"
    extern_module_declaration: $ => seq(
      'extern',
      'module',
      field('name', $.module_id),
      field('path', $.string_literal)
    ),

    module_body: $ => seq(
      '{',
      repeat($.module_member),
      '}'
    ),

    // -- Module Members --

    module_member: $ => choice(
      $.requires_declaration,
      $.header_declaration,
      $.umbrella_dir_declaration,
      $.submodule_declaration,
      $.export_declaration,
      $.export_as_declaration,
      $.use_declaration,
      $.link_declaration,
      $.config_macros_declaration,
      $.conflict_declaration
    ),

    // requires cplusplus, !fun_feature
    requires_declaration: $ => seq(
      'requires',
      $.feature_list
    ),

    feature_list: $ => seq(
      $.feature,
      repeat(seq(',', $.feature))
    ),

    feature: $ => seq(
      optional('!'),
      $.identifier
    ),

    // [private] [textual] header "foo.h" { size 123 }
    // umbrella header "bar.h"
    // exclude header "baz.h"
    header_declaration: $ => seq(
      choice(
        seq(optional('private'), optional('textual')),
        'umbrella',
        'exclude'
      ),
      'header',
      field('path', $.string_literal),
      optional($.header_attributes)
    ),

    header_attributes: $ => seq(
      '{',
      repeat($.header_attribute),
      '}'
    ),

    header_attribute: $ => seq(
      choice('size', 'mtime'),
      $.integer_literal
    ),

    // umbrella "directory/path"
    umbrella_dir_declaration: $ => seq(
      'umbrella',
      field('path', $.string_literal)
    ),

    // Submodules are just nested module declarations
    submodule_declaration: $ => choice(
      $._module_declaration,
      $.inferred_submodule_declaration,
    ),

    inferred_submodule_declaration: $ => seq(
      optional('explicit'),
      optional('framework'),
      'module',
      '*',
      optional($.attributes),
      '{',
      repeat($.inferred_submodule_member),
      '}'
    ),

    inferred_submodule_member: $ => seq(
      'export',
      '*'
    ),

    // export *
    // export std.io
    export_declaration: $ => seq(
      'export',
      $.wildcard_module_id
    ),

    // export_as MyFramework
    export_as_declaration: $ => seq(
      'export_as',
      $.identifier
    ),

    // use MyModule
    use_declaration: $ => seq(
      'use',
      $.module_id
    ),

    // link [framework] "MyLib"
    link_declaration: $ => seq(
      'link',
      optional('framework'),
      field('library', $.string_literal)
    ),

    // config_macros [exhaustive] MACRO_A, MACRO_B
    config_macros_declaration: $ => seq(
      'config_macros',
      optional($.attributes),
      optional($.config_macro_list)
    ),

    config_macro_list: $ => seq(
      $.identifier,
      repeat(seq(',', $.identifier))
    ),

    // conflict MyModule, "Reason"
    conflict_declaration: $ => seq(
      'conflict',
      field('module', $.module_id),
      ',',
      field('message', $.string_literal)
    ),

    // -- Common Structures --

    // [system] [extern_c]
    attributes: $ => repeat1($.attribute),

    attribute: $ => seq(
      '[',
      $.identifier,
      ']'
    ),

    // A.B.C
    module_id: $ => seq(
      $.identifier,
      repeat(seq('.', $.identifier))
    ),
    wildcard_module_id: $ => choice(
      $.identifier,
      '*',
      seq(identifier, '.', wildcard_module_id)),
    // A.B.*
    wildcard_module_id: $ => seq(
      choice($.identifier, '*'),
      repeat(seq('.', choice($.identifier, '*')))
    ),

    // -- Lexical Tokens --

    identifier: $ => /[a-zA-Z_]\w*/,

    // Simple string literal handling
    string_literal: $ => /"[^"\n]*"/,

    integer_literal: $ => /\d+/,

    comment: $ => token(choice(
      seq('//', /.*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/'
      )
    )),
  }
});

