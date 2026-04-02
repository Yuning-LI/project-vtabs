export const songAbcMap: Record<string, string> = {
  'twinkle': `X:1
T:Twinkle, Twinkle, Little Star
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 |
G G F F | E E D2 | G G F F | E E D2 |
C C G G | A A G2 | F F E E | D D C2 |]`,

  'ode-to-joy': `X:1
T:Ode to Joy
M:4/4
L:1/4
K:C
E E F G | G F E D | C C D E | E3/2 D/2 D2 |
E E F G | G F E D | C C D E | D3/2 C/2 C2 |]`,

  'amazing-grace': `X:1
T:Amazing Grace
M:3/4
L:1/8
K:C
C2 E2 G2 | c4 B2 | A2 G2 E2 | C4 |
C2 E2 G2 | A4 G2 | F2 E2 D2 | C4 |]`,

  'mary-lamb': `X:1
T:Mary Had a Little Lamb
M:4/4
L:1/4
K:C
E D C D | E E E2 | D D D2 | E E E2 |
E D C D | E E E2 | D D E D | C2 C2 |]`,

  'jingle-bells': `X:1
T:Jingle Bells
M:4/4
L:1/8
K:C
E E E E | E E E2 | E G C D | E2 C2 |
E E E E | E E E2 | E G C D | E2 C2 |]`,

  'happy-birthday': `X:1
T:Happy Birthday
M:3/4
L:1/4
K:C
G G A G c B | G G A G d c | G G g e c B A | f f e c d c |]`,

  'auld-lang-syne': `X:1
T:Auld Lang Syne
M:4/4
L:1/4
K:C
C|F F F E|F F F2 E|F F F E|F4 C|
F F F E|F F F2 G|A A G F|C4|]`,

  'scarborough-fair': `X:1
T:Scarborough Fair
M:3/4
L:1/4
K:C
E|G2G|c2B|A2G|F2F|E3-|E2E|
G2G|c2B|A2G|F2F|E3-|E2E|
G2G|c2c|B2A|G2F|E3-|E2E|
c2B|A2G|F2F|E2D|C3-|C2|`,

  'greensleeves': `X:168
T:B168-  Greensleeves
S:(1st/6)
Q:120
L:1/4
M:6/4
K:Gm
G|B2cd3/2e/2d|c2AF3/2G/2A|B2GG3/2^F/2G|A2^FD2G|\
B2cd3/2e/2d|c2AF3/2G/2A|B3/2A/2G^F3/2=E/2F|G3D3|\
(f3f2)=e/2d/2|c2AF3/2G/2A|B2GG3/2^F/2G|A2^FD3|\
(f3f2)=e/2d/2|c2AF3/2G/2A|B2G^F3/2=E/2F|(G3G2)|]`,

  'danny-boy': `X:1
T:Danny Boy
M:4/4
L:1/4
K:C
C|D E F|G2 A|B c d|e3|
e d c|B A G|F E D|C3|
C|D E F|G2 A|B c d|e3|
e d c|B A G|F E D|C3|`,

  'sakura': `X:1
T:Sakura Sakura
M:3/4
L:1/4
K:C
C|C D E|D C D|E F G|F3|
E F G|A G A|B c d|c3|
c B c|A G F|E G E|D3|
C D E|D C D|E F G|F3|`,

  'when-the-saints': `X:1
T:When the Saints Go Marching In
M:4/4
L:1/4
K:C
C|E E E E|F F F F|E E E E|C4|
E E E E|F F F F|E E E E|C4|
C C C C|D D D D|E E E E|F4|
E E E E|F F F F|E E E E|C4|]`,

  'you-are-my-sunshine': `X:1
T:You Are My Sunshine
M:4/4
L:1/4
K:C
C|C C C D|E3 C|C C C D|E3 C|
C C E G|A3 G|F F E D|C3 C|
C C C D|E3 C|C C C D|E3 C|
C C E G|A3 G|F F E D|C3|]`,

  'over-the-rainbow': `X:1
T:Over the Rainbow
M:4/4
L:1/4
K:C
C|C C C C|E3 C|G G G G|A3 G|
E E E E|F3 F|E E D D|C3 C|
C C C C|E3 C|G G G G|A3 G|
E E E E|F3 F|E D C2|C3|]`,

  'we-wish-you': `X:1
T:We Wish You a Merry Christmas
M:3/4
L:1/4
K:C
C|C C C|D D D|E E F|G3|
G G G|A A A|G G F|E3|
C C C|D D D|E E F|G3|
G G G|A A A|G F E|C3|]`
}

export const songTitleMap: Record<string, string> = {
  'twinkle': 'Twinkle, Twinkle, Little Star',
  'ode-to-joy': 'Ode to Joy',
  'amazing-grace': 'Amazing Grace',
  'mary-lamb': 'Mary Had a Little Lamb',
  'jingle-bells': 'Jingle Bells',
  'happy-birthday': 'Happy Birthday',
  'auld-lang-syne': 'Auld Lang Syne',
  'scarborough-fair': 'Scarborough Fair',
  'greensleeves': 'Greensleeves',
  'danny-boy': 'Danny Boy',
  'sakura': 'Sakura Sakura',
  'when-the-saints': 'When the Saints Go Marching In',
  'you-are-my-sunshine': 'You Are My Sunshine',
  'over-the-rainbow': 'Over the Rainbow',
  'we-wish-you': 'We Wish You a Merry Christmas'
}

export const songMetaMap: Record<string, { key: string; tempo: number }> = {
  'twinkle': { key: 'C', tempo: 100 },
  'ode-to-joy': { key: 'C', tempo: 120 },
  'amazing-grace': { key: 'C', tempo: 80 },
  'mary-lamb': { key: 'C', tempo: 110 },
  'jingle-bells': { key: 'C', tempo: 130 },
  'happy-birthday': { key: 'C', tempo: 90 },
  'auld-lang-syne': { key: 'C', tempo: 100 },
  'scarborough-fair': { key: 'C', tempo: 100 },
  'greensleeves': { key: 'C', tempo: 100 },
  'danny-boy': { key: 'C', tempo: 100 },
  'sakura': { key: 'C', tempo: 100 },
  'when-the-saints': { key: 'C', tempo: 100 },
  'you-are-my-sunshine': { key: 'C', tempo: 100 },
  'over-the-rainbow': { key: 'C', tempo: 100 },
  'we-wish-you': { key: 'C', tempo: 100 }
}
