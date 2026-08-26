import * as React from 'react'
import { cn } from '@/lib/utils'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-tight tracking-tight', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('pt-0', className)} {...props}>
      {children}
    </div>
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
)
CardFooter.displayName = 'CardFooter'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  Header?: React.ReactNode
  Title?: React.ReactNode
  Description?: React.ReactNode
  Content?: React.ReactNode
  Footer?: React.ReactNode
}

interface CardCompound {
  Header: typeof CardHeader
  Title: typeof CardTitle
  Description: typeof CardDescription
  Content: typeof CardContent
  Footer: typeof CardFooter
}

type CardType = React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>> & CardCompound

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, Header, Title, Description, Content, Footer, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-card',
        className
      )}
      {...props}
    >
      {Header && <CardHeader>{Header}</CardHeader>}
      {Title && <CardTitle>{Title}</CardTitle>}
      {Description && <CardDescription>{Description}</CardDescription>}
      {Content && <CardContent>{Content}</CardContent>}
      {Footer && <CardFooter>{Footer}</CardFooter>}
      {props.children}
    </div>
  )
) as CardType
Card.displayName = 'Card'

// Compound components attached as static properties
Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Content = CardContent
Card.Footer = CardFooter

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }