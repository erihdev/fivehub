import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
			fivehub: {
				// 2025 Color Trends
				navy: 'hsl(var(--fivehub-navy))',
				'navy-light': 'hsl(var(--fivehub-navy-light))',
				'navy-dark': 'hsl(var(--fivehub-navy-dark))',
				camel: 'hsl(var(--fivehub-camel))',
				tan: 'hsl(var(--fivehub-tan))',
				terracotta: 'hsl(var(--fivehub-terracotta))',
				'terracotta-light': 'hsl(var(--fivehub-terracotta-light))',
				sage: 'hsl(var(--fivehub-sage))',
				olive: 'hsl(var(--fivehub-olive))',
				'dusty-rose': 'hsl(var(--fivehub-dusty-rose))',
				teal: 'hsl(var(--fivehub-teal))',
				lime: 'hsl(var(--fivehub-lime))',
				chocolate: 'hsl(var(--fivehub-chocolate))',
				// Legacy compatibility
				orange: 'hsl(var(--fivehub-orange))',
				'orange-light': 'hsl(var(--fivehub-orange-light))',
				'orange-dark': 'hsl(var(--fivehub-orange-dark))',
				gold: 'hsl(var(--fivehub-gold))',
				cream: 'hsl(var(--fivehub-cream))',
				brown: 'hsl(var(--fivehub-brown))',
				'brown-light': 'hsl(var(--fivehub-brown-light))',
				coral: 'hsl(var(--fivehub-coral))',
				amber: 'hsl(var(--fivehub-amber))',
				ruby: 'hsl(var(--fivehub-ruby))',
				emerald: 'hsl(var(--fivehub-emerald))'
			},
			// Legacy dal colors for backward compatibility
			dal: {
				burnt: 'hsl(var(--dal-burnt))',
				orange: 'hsl(var(--dal-orange))',
				gold: 'hsl(var(--dal-gold))',
				teal: 'hsl(var(--dal-teal))',
				cream: 'hsl(var(--dal-cream))',
				dark: 'hsl(var(--dal-dark))'
			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			display: [
  				'Cairo',
  				'sans-serif'
  			],
  			arabic: [
  				'Cairo',
  				'sans-serif'
  			],
  			body: [
  				'Cairo',
  				'sans-serif'
  			],
  			sans: [
  				'Roboto',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif'
  			],
  			serif: [
  				'Libre Caslon Text',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			],
  			mono: [
  				'Roboto Mono',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		},
  		spacing: {
  			'18': '4.5rem',
  			'88': '22rem',
  			'128': '32rem'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			shimmer: {
  				'100%': {
  					transform: 'translateX(100%)'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'scale-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.95)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			'slide-up': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'glow-pulse': {
  				'0%, 100%': {
  					boxShadow: '0 0 20px hsl(var(--dal-orange) / 0.3)'
  				},
  				'50%': {
  					boxShadow: '0 0 40px hsl(var(--dal-orange) / 0.5)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			shimmer: 'shimmer 2s infinite',
  			'fade-in': 'fade-in 0.3s ease-out',
  			'scale-in': 'scale-in 0.2s ease-out',
  			'slide-up': 'slide-up 0.4s ease-out',
  			'glow-pulse': 'glow-pulse 2s ease-in-out infinite'
  		},
  		transitionTimingFunction: {
  			'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  		},
  		backgroundImage: {
  			'gradient-salmani': 'linear-gradient(135deg, hsl(var(--dal-burnt)) 0%, hsl(var(--dal-orange)) 100%)',
  			'gradient-dal': 'linear-gradient(135deg, hsl(var(--dal-orange)) 0%, hsl(var(--dal-gold)) 100%)',
  			'gradient-luxury': 'linear-gradient(135deg, hsl(var(--fivehub-orange)) 0%, hsl(var(--fivehub-gold)) 50%, hsl(var(--fivehub-coral)) 100%)',
  			'gradient-vibrant': 'linear-gradient(135deg, hsl(var(--fivehub-orange)) 0%, hsl(var(--fivehub-gold)) 100%)',
  			'gradient-sunset': 'linear-gradient(135deg, hsl(var(--fivehub-coral)) 0%, hsl(var(--fivehub-orange)) 50%, hsl(var(--fivehub-gold)) 100%)'
  		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;