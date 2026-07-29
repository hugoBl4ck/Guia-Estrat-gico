# 📚 Resumo do Livro: Atributos e Métodos de Classe
**Autor:** Victor de Andrade Machado  
**Editora:** Sagah  

Este livro aborda em detalhes os conceitos de escopo de classe e escopo de instância em Java, esclarecendo como variáveis e funções se comportam quando pertencem a objetos individuais ou à classe como um todo.

---

## 🔍 1. Conceito e Tipos de Atributos

Os atributos representam as características ou propriedades de uma classe. Eles são divididos em duas categorias principais:

### A. Atributos de Instância
* **O que são:** Variáveis declaradas dentro da classe, mas fora de qualquer método ou bloco.
* **Comportamento:** Cada objeto (instância) criado possui sua **própria cópia independente** desses atributos na memória Heap.
* **Exemplo:** Se a classe `Carro` possui os atributos de instância `marca` e `modelo`, alterar o modelo de um carro não interfere no modelo do outro.

### B. Atributos de Classe (Estáticos)
* **O que são:** Atributos declarados com a palavra-chave `static`.
* **Comportamento:** Pertencem à classe em si e não aos objetos individuais. Há **apenas uma cópia** do atributo compartilhada por todas as instâncias na memória (Method Area).
* **Exemplo:** `static String fabricante;` na classe `Carro`. Se mudarmos `Carro.fabricante = "Toyota";`, todos os carros herdam instantaneamente esse mesmo valor de fabricante.
* **Acesso:** Pode ser acessado diretamente através do nome da classe: `NomeDaClasse.atributoEstatico`.

---

## ⚙️ 2. Métodos de Instância vs. Métodos de Classe

Os métodos executam ações e comportamentos. Também são classificados de duas formas:

### A. Métodos de Instância
* **Comportamento:** Associados a um objeto específico. Só podem ser chamados a partir de um objeto existente (`meuCarro.acelerar()`).
* **Acesso a Dados:** Podem acessar e modificar **tanto os atributos de instância quanto os atributos estáticos** da classe.
* **Uso:** Implementam ações específicas do objeto (ex: `acelerar()`, `imprimirInformacoes()`).

### B. Métodos de Classe (Estáticos)
* **Comportamento:** Associados à classe e definidos com a palavra-chave `static`. Podem ser chamados diretamente via nome da classe (`Calculadora.somar(5, 3)`), sem precisar dar `new`.
* **Restrição Crítica:** **Não possuem acesso aos atributos ou métodos de instância** (pois não estão associados a nenhum objeto específico). Tentar usar `this` ou atributos não-estáticos dentro deles resulta em erro de compilação.
* **Uso comum:** Funções utilitárias, conversores de unidades, validações genéricas ou métodos matemáticos (ex: métodos da classe `Math` em Java).

---

## 🛠️ 3. Exemplo Prático Integrado (`Carro` e `Frota`)

O material demonstra a aplicação prática através de duas classes que trabalham juntas:

### Classe `Carro`
Controle individual e contagem global de veículos criados.
```java
public class Carro { 
    // Atributo estático (compartilhado)
    private static int totalCarros; 
    
    // Atributos de instância (específicos de cada objeto)
    private String marca; 
    private String modelo; 
    
    public Carro(String marca, String modelo) { 
        this.marca = marca; 
        this.modelo = modelo; 
        totalCarros++; // Toda vez que cria um carro, incrementa o total global
    } 
    
    public String getMarca() { return marca; } 
    public String getModelo() { return modelo; } 
    
    // Método estático para ler o total global de carros criados
    public static int getTotalCarros() { 
        return totalCarros; 
    } 
}
```

### Classe `Frota`
Gerenciamento de um grupo de carros através de um array.
```java
public class Frota { 
    private Carro[] carros; // Atributo de instância
    
    public Frota(int tamanho) { 
        carros = new Carro[tamanho];
    } 
    
    public void adicionarCarro(Carro carro, int indice) { 
        carros[indice] = carro; 
    } 
    
    public Carro[] getCarros() { 
        return carros; 
    }
}
```

---

## 🧠 Hack de Memorização
> [!TIP]
> * **Se é dinâmico** e depende do estado de um objeto específico $\rightarrow$ **Sem `static`** (De Instância).
> * **Se é fixo**, global ou utilitário $\rightarrow$ **Com `static`** (De Classe).
