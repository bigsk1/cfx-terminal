import { extendTheme } from '@chakra-ui/react';

// Cyberpunk theme colors
const colors = {
  brand: {
    bg: '#0f0e17',
    primary: '#7f5af0',
    secondary: '#2cb67d',
    accent: '#ff8906',
    text: '#fffffe',
    dark: '#16161a',
    card: '#242629',
    danger: '#e53170',
    warning: '#f9c846'
  }
};

// Export the theme
export const theme = extendTheme({
  colors,
  styles: {
    global: {
      body: {
        bg: colors.brand.bg,
        color: colors.brand.text,
      }
    }
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'bold',
        borderRadius: 'md',
      },
      variants: {
        solid: (props: any) => ({
          bg: props.colorScheme === 'twitter' ? colors.brand.primary : undefined,
          _hover: {
            bg: props.colorScheme === 'twitter' ? colors.brand.primary : undefined,
            opacity: 0.8,
          }
        }),
      }
    },
    Input: {
      variants: {
        filled: {
          field: {
            bg: 'whiteAlpha.100',
            _hover: {
              bg: 'whiteAlpha.200',
            },
            _focus: {
              bg: 'whiteAlpha.100',
            }
          }
        }
      },
      defaultProps: {
        variant: 'filled',
      }
    },
    Textarea: {
      variants: {
        filled: {
          bg: 'whiteAlpha.100',
          _hover: {
            bg: 'whiteAlpha.200',
          },
          _focus: {
            bg: 'whiteAlpha.100',
          }
        }
      },
      defaultProps: {
        variant: 'filled',
      }
    },
    // Add styling for Select component
    Select: {
      baseStyle: {
        field: {
          color: colors.brand.text,
        },
      },
      variants: {
        filled: {
          field: {
            bg: 'whiteAlpha.100',
            _hover: {
              bg: 'whiteAlpha.200',
            },
            _focus: {
              bg: 'whiteAlpha.100',
            }
          }
        }
      },
      defaultProps: {
        variant: 'filled',
      }
    },
    // Add styling for Menu components
    Menu: {
      baseStyle: {
        list: {
          bg: colors.brand.dark,
          borderColor: 'whiteAlpha.300',
          boxShadow: 'md',
          color: colors.brand.text,
        },
        item: {
          bg: 'transparent',
          color: colors.brand.text,
          _hover: {
            bg: 'whiteAlpha.200',
          },
          _focus: {
            bg: 'whiteAlpha.200',
          }
        }
      }
    }
  }
}); 