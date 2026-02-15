# Contributing to Depix ↔ Bitcoin Atomic Swap

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain a professional environment

## Getting Started

### Prerequisites

Before contributing, ensure you have:
- Python 3.9+
- Node.js 18+
- elementsd (Liquid Network daemon)
- Electrum wallet
- Git

### Setting Up Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/diorwave/ChainBridge-Swap.git
   cd ChainBridge-Swap
   ```

3. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   cd frontend
   npm install
   cd ..
   ```

5. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

6. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Backend Development

The backend is built with FastAPI and follows this structure:

```
backend/
├── api/          # REST API endpoints
├── wallets/      # Blockchain wallet integrations
├── htlc/         # HTLC logic and swap engine
└── db/           # Database storage
```

**Running backend:**
```bash
cd backend
python main.py
```

**Testing:**
```bash
pytest tests/
```

### Frontend Development

The frontend is built with React, TypeScript, and Vite:

```
frontend/src/
├── components/   # React components
├── api/          # API client
└── types/        # TypeScript types
```

**Running frontend:**
```bash
cd frontend
npm run dev
```

**Linting:**
```bash
npm run lint
```

## Contribution Guidelines

### Code Style

**Python:**
- Follow PEP 8 style guide
- Use type hints where possible
- Write docstrings for functions and classes
- Keep functions focused and small

**TypeScript/React:**
- Use functional components with hooks
- Follow React best practices
- Use TypeScript strict mode
- Keep components small and reusable

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add support for Lightning Network swaps
fix: resolve timelock calculation bug
docs: update API endpoint documentation
test: add HTLC engine unit tests
refactor: simplify wallet interface
```

Prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions or changes
- `refactor:` - Code refactoring
- `style:` - Code style changes
- `chore:` - Maintenance tasks

### Pull Request Process

1. **Update your branch:**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run tests:**
   ```bash
   pytest tests/
   cd frontend && npm run lint
   ```

3. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

4. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request:**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for changes
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

## Areas for Contribution

### High Priority

- **Security Enhancements**
  - Improve HTLC script validation
  - Add transaction verification
  - Implement rate limiting

- **Testing**
  - Increase test coverage
  - Add integration tests
  - Add end-to-end tests

- **Documentation**
  - Improve API documentation
  - Add architecture diagrams
  - Create video tutorials

### Feature Ideas

- Support for additional blockchains
- Lightning Network integration
- Multi-party swaps
- Automated market maker
- Mobile app interface
- Hardware wallet support

### Bug Fixes

Check the [Issues](https://github.com/diorwave/ChainBridge-Swap/issues) page for:
- Bugs labeled `good first issue`
- Feature requests
- Documentation improvements

## Testing Guidelines

### Writing Tests

**Backend tests:**
```python
import pytest
from htlc import HTLCEngine

def test_create_hashlock():
    engine = HTLCEngine()
    secret = engine.generate_secret()
    hashlock = engine.create_hashlock(secret)
    assert engine.verify_secret(secret, hashlock)
```

**Frontend tests:**
```typescript
import { render, screen } from '@testing-library/react';
import SwapForm from './SwapForm';

test('renders swap form', () => {
  render(<SwapForm />);
  expect(screen.getByText('Create Swap')).toBeInTheDocument();
});
```

### Running Tests

```bash
# Backend tests
pytest tests/ -v

# Frontend tests (when implemented)
cd frontend
npm test
```

## Security

### Reporting Vulnerabilities

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email security details to: [mirai.lucky.dev@gmail.com]
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Security Best Practices

- Never commit private keys or secrets
- Use environment variables for sensitive data
- Validate all user inputs
- Sanitize data before database operations
- Use HTTPS in production
- Implement proper authentication

## Documentation

### Code Documentation

- Add docstrings to all functions and classes
- Include parameter types and return types
- Provide usage examples for complex functions

**Example:**
```python
async def create_htlc(
    self, 
    amount: float, 
    hashlock: str, 
    timelock: int, 
    recipient: str
) -> Dict[str, Any]:
    """
    Create Hash Time-Locked Contract on Bitcoin.
    
    Args:
        amount: Amount in BTC
        hashlock: SHA256 hash of secret
        timelock: Unix timestamp for refund
        recipient: Bitcoin address to receive funds
        
    Returns:
        Dict containing txid and HTLC details
        
    Raises:
        Exception: If transaction creation fails
    """
```

### README Updates

When adding features, update:
- Installation instructions
- Configuration options
- Usage examples
- API documentation

## Questions?

- Open a [Discussion](https://github.com/diorwave/ChainBridge-Swap/discussions)
- Join our community chat
- Check existing [Issues](https://github.com/diorwave/ChainBridge-Swap/issues)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to making atomic swaps more accessible! 🚀
