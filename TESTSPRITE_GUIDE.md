# Guia de Uso do Testsprite

## O que é o Testsprite?

Testsprite é uma plataforma de testes automatizados com IA que analisa seu código e gera testes abrangentes automaticamente para:

- **APIs Backend**: Testes de segurança, validação de dados, tratamento de erros
- **Interface Frontend**: Testes de UI/UX, compatibilidade entre navegadores
- **Testes de Carga**: Performance e concorrência
- **Casos Extremos**: Validação de cenários incomuns

## Configuração Concluída ✅

A integração do Testsprite já está configurada neste projeto:

- ✅ Pacote `@testsprite/testsprite-mcp` instalado
- ✅ API Key configurada nas variáveis de ambiente
- ✅ Arquivo de configuração MCP criado (`.mcp.json`)

## Como Usar

### Opção 1: Via Interface Web (Recomendado)

1. Acesse: https://www.testsprite.com/dashboard
2. Faça login com sua conta
3. Crie um novo projeto de testes
4. Forneça ao Testsprite:
   - URL da aplicação (quando publicada)
   - Descrição do que o sistema faz
   - Endpoints principais para testar

### Opção 2: Via MCP no Replit Agent

O Testsprite já está configurado para funcionar com o Replit Agent através do MCP. Você pode:

1. Pedir ao Agent para "testar o sistema com Testsprite"
2. O Agent se comunicará com o Testsprite via MCP
3. Testes serão gerados e executados automaticamente

## Áreas do Sistema para Testar

Recomendamos focar os testes do Testsprite nas seguintes áreas críticas:

### 1. Módulo Fiscal (Prioridade Alta)
- Geração de CT-e (Auto e Rápido)
- Criação de MDF-e
- Validação de chaves de acesso
- Multi-tenancy (isolamento de dados entre clientes)

### 2. Autenticação e Segurança
- Login com JWT
- Permissões por módulo
- Isolamento de banco de dados por tenant

### 3. APIs Críticas
- `/api/cte-documentos` - CRUD de CT-e
- `/api/mdfe-documentos` - CRUD de MDF-e
- `/api/frete-documentos` - Documentos de frete
- `/api/auth/login` - Autenticação
- `/api/db/query` - Queries multi-tenant

### 4. Gestão de Frota
- Cadastro de veículos
- Abastecimentos
- Manutenções
- Checklists

## Executando Testes

### Teste Completo do Sistema

```bash
# O Testsprite executará testes na nuvem
# Acesse os resultados em: https://www.testsprite.com/dashboard
```

### Ver Resultados

1. Acesse o dashboard: https://www.testsprite.com/dashboard
2. Veja relatórios detalhados com:
   - Descrição clara dos problemas
   - Stack traces completos
   - Análise de causa raiz
   - Sugestões de correção

## Recursos Úteis

- **Dashboard**: https://www.testsprite.com/dashboard
- **API Keys**: https://www.testsprite.com/dashboard/settings/apikey
- **Documentação**: https://docs.testsprite.com/
- **GitHub**: https://github.com/TestSprite/Docs

## Benefícios para o Sistema de Frota

Com o Testsprite configurado, você pode:

✅ **Detectar bugs antes de ir para produção**
✅ **Validar segurança** (especialmente importante para dados fiscais)
✅ **Garantir isolamento multi-tenant** (SystemTruck vs GDA Transportes)
✅ **Testar performance** com múltiplos usuários simultâneos
✅ **Validar integrações** com APIs externas
✅ **Documentar comportamento esperado** através dos testes

## Próximos Passos

1. Acesse o dashboard do Testsprite
2. Crie seu primeiro projeto de testes
3. Aponte para a URL do sistema (após publicar)
4. Deixe o Testsprite gerar e executar testes automaticamente
5. Revise os resultados e corrija problemas encontrados

---

**Dica**: Execute testes regularmente, especialmente após:
- Adicionar novas funcionalidades
- Fazer alterações em APIs críticas
- Antes de fazer deploy para produção
