import type { InsertAnnotation, InsertLight, InsertMarker, InsertScene } from '$lib/db/app/schema';

// The demo game session seeded for brand-new users (see createDemoGameSession).
// This is a raw game session export pasted verbatim: to refresh it, export a
// session from the app and replace the object below. IDs are regenerated at
// seed time; mapLocation and mapThumbLocation must point at shared R2 keys.
type DemoScene = InsertScene & {
  markers: InsertMarker[];
  lights: InsertLight[];
  annotations: InsertAnnotation[];
};

export const demoSessionData: {
  version: string;
  metadata: { exportDate: string; exportType: string };
  gameSession: { name: string; scenes: DemoScene[] };
} = {
  version: '0.0.6',
  metadata: {
    exportDate: '2026-07-05T13:16:30.373Z',
    exportType: 'gameSession'
  },
  gameSession: {
    name: 'New session',
    scenes: [
      {
        id: '69807e23-8ca3-4f23-a0b6-7b6521c353e1',
        gameSessionId: '54c3d99f-b667-4ead-9a2a-a73103f10715',
        name: 'First scene',
        order: 1,
        backgroundColor: '#0b0b0c',
        displayPaddingX: 16,
        displayPaddingY: 16,
        displaySizeX: 34.86302148498197,
        displaySizeY: 19.61044958530236,
        displayResolutionX: 1920,
        displayResolutionY: 1080,
        fogOfWarColor: '#626262',
        fogOfWarOpacityDm: 0.78,
        fogOfWarOpacityPlayer: 0.9,
        mapLocation: 'map/pirateking-30x60.jpg',
        mapThumbLocation: 'thumbnail/pirateking-thumb.jpg',
        mapRotation: 90,
        mapOffsetX: -686.9383096518437,
        mapOffsetY: 3.448541131377827,
        mapZoom: 0.9178779875342912,
        gridType: 0,
        gridMode: 1,
        gridMapDefinedX: 30,
        gridMapDefinedY: 60,
        mapCoordVersion: 1,
        gridSpacing: 1,
        gridOpacity: 0.16,
        gridLineColor: '#000000',
        gridLineThickness: 1,
        gridShadowColor: '#000000',
        gridShadowSpread: 2,
        gridShadowBlur: 0.5,
        gridShadowOpacity: 0,
        sceneOffsetX: 0,
        sceneOffsetY: 0,
        sceneRotation: 0,
        weatherFov: 70,
        weatherIntensity: 0.7,
        weatherOpacity: 1,
        weatherType: 1,
        fogEnabled: false,
        fogColor: '#a0a0a0',
        fogOpacity: 0.8,
        edgeEnabled: false,
        edgeUrl: '',
        edgeOpacity: 0.3,
        edgeScale: 2,
        edgeFadeStart: 0.2,
        edgeFadeEnd: 1,
        effectsEnabled: true,
        effectsBloomIntensity: 0,
        effectsBloomThreshold: 0.5,
        effectsBloomSmoothing: 0.3,
        effectsBloomRadius: 0.5,
        effectsBloomLevels: 10,
        effectsBloomMipMapBlur: true,
        effectsChromaticAberrationOffset: 0,
        effectsLutUrl: null,
        effectsToneMappingMode: 0,
        markerStrokeColor: '#000000',
        markerStrokeWidth: 50,
        markerTextColor: '#ffffff',
        markerTextStrokeColor: '#000000',
        annotationLayers: null,
        fogOfWarMask:
          'CAcAABAOAAABnrvjARzkDSzWDTjLDULCDUq6DVKzDVitDV6nDWShDWqcDW+WDXSSDXiODX2JDYEBhQ2FAYENiQH9DI0B+QyRAfUMlAHyDJgB7wybAesMngHoDKIB5QylAeEMqAHfDKsB2wyuAdkMsAHXDLMB0wy2AdEMuAHPDLsBzAy9AckMwAHHDMIBxQzEAcMMxwHADMkBvgzLAbwMzQG5DNABtwzSAbUM1AGzDNYBsQzYAa8M2gGuDNsBrAzdAaoM3wGoDOEBpgziAaUM5AGjDOYBoQzoAaAM6QGeDOsBnAzsAZsM7gGZDPABmAzxAZYM8gGVDPQBlAz1AZIM9wGQDPgBjwz6AY4M+wGMDPwBjAz9AYoM/gGJDIACiAyBAoYMggKFDIQChAyEAoMMhgKCDIcCgAyIAoAMiQL+C4oC/guLAvwLjAL8C40C+guOAvoLjwL4C5AC+AuRAvYLkwL1C5MC9AuVAvMLlgLyC5cC8AuaAu4LmwLsC54C6gugAugLogLlC6UC4wunAuELqQLeC6wC3AuuAtoLsALXC7MC1Qu1AtMLtgLRC7kCzwu7As0LvALLC78CyQvAAsgLwgLGC8MCxAvGAsILxwLBC8kCvwvKAr4LywK8C80CuwvPArkL0AK4C9ECtwvSArUL1AK0C9YCsgvXArEL2AKwC9oCrgvbAqwL3QKrC94CqgvgAqgL4QKnC+ICpgvjAqUL5AKkC+YCogvnAqEL6QKeC+sCnQvtApsL7gKaC/ACmAvxApcL8gKWC/QClAv1ApML9gKSC/cCkQv5Ao8L+gKOC/sCjQv8AowL/QKLC/4Cigv/AokLgAOIC4IDhguDA4ULhAOEC4YDgguHA4ELiAOAC4kD/wqLA/0KjAP8Co0D+wqOA/oKjwP5CpAD+AqRA/cKkgP2CpMD9QqUA/QKlQPzCpYD8gqXA/EKmAPwCpkD7wqaA+4KmwPtCpwD7AqdA+sKngPqCp8D6QqgA+gKoQPnCqID5gqiA+YKowPlCqQD5AqlA+MKpgPiCqYD4gqnA+EKqAPhCqgD4AqoA+AKqQPfCqoD3gqqA94KqwPdCqwD3AqsA9wKrQPbCq4D2wqtA9sKrgPaCq8D2QqvA9kKsAPYCrED1wqxA9gKsQPXCrID1gqyA9YKswPVCrQD1Qq3A9EKuwPNCr8DyQrDA8YKxgPCCsoDvgrOA7oK0QO4CtMDtQrWA7IK2QOwCtoDrgrdA6sK3wOpCuEDqAriA6YK5AOkCuYDowrnA6EK6QOgCuoDngrrA50K7QOcCu4DmgrvA5kK8QOYCvEDlwrzA5YK8wOVCvQDlQr1A5MK9gOTCvYDkgr4A5EK+AOQCvkDjwr7A40K/AONCvwDjAr+A4oK/wOKCv8DiQqBBIcKggSGCoMEhgqDBIUKhASECoUEhAqGBIIKhwSBCogEgQqIBIAKiQT/CYoE/gmLBP4JiwT9CYwE/AmNBPsJjgT7CY4E+gmPBPkJkAT5CZAE+AmRBPcJkgT2CZQE9QmUBPQJlQTzCZYE8gmYBPAJmQTvCZoE7wmaBO4JmwTtCZwE7AmeBOoJnwTqCZ8E6QmgBOgJoQTnCaIE5gmjBOYJowTlCaME5QmkBOQJpQTkCaUE4wmmBOIJpwTiCacE4QmoBOAJqAThCagE4AmpBN8JqgTfCakE3wmqBN4JqwTeCasE3QmrBN0JrATdCawE3AmsBN0JrATcCa0E2wmtBNwJrQTbCa0E3AmtBNsJrgTbCa0E2wmuBNsJrQTbCa4E2wmtBNsJrgTbCa4E2gmuBNsJrgTaCa4E2wmuBNoJrgTbCa4E2gmuBNsJrgTaCa4E2wmuBNoJrgTbCa4E2gmuBNsJrgTaCa4E2wmtBNsJrgTbCa0E2wmuBNsJrQTbCa4E2wmtBNsJrgTbCa0E2wmtBNwJrQTbCa0E3AmtBNwJrATcCawE3QmsBNwJrATdCasE3QmsBNwJrATdCawE3AmsBN0JrATcCawE3QmsBNwJrQTcCawE3AmtBNwJrATcCa0E3AmsBNwJrQTbCa0E3AmtBNsJrQTbCa0E3AmtBNsJrQTcCa0E2wmtBNsJrgTbCa0E2wmuBNsJrQTbCa4E2wmtBNsJrgTbCa0E2wmuBNsJrgTaCa4E2wmuBNoJrgTbCa4E2gmuBNsJrgTbCa0E2wmtBNwJrQTbCa0E3AmtBNwJrATcCa0E3AmsBN0JqwTdCawE3QmrBN4JqwTdCasE3gmqBN8JqgTfCakE3wmpBOAJqQTgCagE4QmnBOEJqAThCacE4gmmBOMJpQTkCaUE5AmkBOUJowTmCaME5gmiBOcJoQToCaAE6QmfBOoJnwTqCZ4E6wmdBOwJnATtCZsE7gmbBO4JmgTvCZkE7QmcBOoJngTnCaIE5AmkBOEJqATeCaoE3AmtBNkJrwTXCbIE0wm1BNEJuATNCbsEywm+BMcJwQTFCcQEwgnGBMAJyAS+CcsEuwnNBLkJ0AS2CdIEtQnTBLMJ1gSwCdgErwnZBK0J3ASrCd0EqQnfBKgJ4QSlCeMEpAnkBKMJ5gSgCegEnwnpBJ4J6gSdCewEmwntBJkJ7wSYCfAElwnyBJUJ8wSUCfQEkwn1BJIJ9gSRCfgEjwn5BI4J+gSNCfsEjAn8BIsJ/QSJCYAFhAJaqQaBBfsBbJ8GggX1AXiXBoQF7gGDAZIGhQXmAZABjAaGBeABmQGIBogF2wGhAYMGiQXXAagB/gWLBdMBrwH6BYwF0AG1AfYFjQXMAbsB8wWOBcoBwAHvBZAFxgHFAewFkQXDAcoB6QWSBcEBzgHmBZMFugHXAeMFlAWzAeAB3wWXBa0B5wHcBZgFqQHtAdkFmQWlAfMB1gWbBaAB+QHSBZ0FnQH9AdAFngWaAYICzQWgBZYBhwLKBaEFkwGLAsgFogWRAY8CxAWkBY8BkgLCBaYFiwGWAsAFpwWJAZoCvQWoBYUBnwK7BakFgQGlArgFqwV8qgK2BawFea4CtAWtBXayArIFrgVztwKvBa8FcLsCrQWxBW2+AqsFsgVqwwKoBbMFaMYCpwWzBWbKAqQFtAVjzgKiBbUFYNICoAW3BV3VAp4FuAVa2gKbBbkFWN0CmgW5BVbgApgFugVU4wKWBbsFUuYClAW8BVDpApMFvAVO7AKRBb0FTO8CjwW+BUryAo0FwAVH9QKMBcAFRvcCigXBBUT6AogFwgVC/QKHBcIFQf8ChQXDBT+CA4IFxQU+hAOABcYFPYYD/gTHBTuJA/wEyAU6iwP6BMkFOI4D9wTLBTeQA/UEzAU2kgPzBM0FNZQD8QTOBTOXA+8EzwUymQPtBNAFMZsD6wTRBS+eA+kE0gUuoAPnBNMFLKMD5ATVBSulA+IE1gUqpwPgBNcFKakD3gTYBSirA9sE2gUmrgPZBNsFJbAD1wTcBSSyA9UE3QUjtAPTBN4FIrYD0ATgBSG4A84E4wUeugPMBOgFGbwDygTtBRS+A8gE8QUQwAPGBPUFDMIDxAT4BQnEA8IE/AUFxgPABP8FAsgDvgTLCbwEzAm7BM4JuQTQCbcE0gm1BNQJswTVCbIE1wmwBNkJrgTbCawE3AmrBN4JqQTgCacE4gmlBOMJpATlCaME5QmhBOgJnwTqCZ0E6wmcBO0JmgTvCZgE8AmXBPIJlQT0CZME9QmSBPcJkAT5CY4E+gmNBPwJiwT+CYkEgAqHBIEKhgSDCoQEhAqDBIYKgQSICv8DiQr+A4sK/AOMCvsDjgr5A5AK9wORCvUDlArzA5UK8gOXCvADmAruA5sK7AOcCusDnQrqA54K6QOfCucDoQrmA6IK5QOjCuQDpArjA6UK4gOmCuEDpwrgA6gK3wOpCt4DqgrdA6sK3AOsCtwDrArbA60K2gOuCtkDrwrYA7AK1wOxCtcDsQrWA7IK1QOzCtQDtArTA7UK0wO1CtIDtgrRA7cK0AO4Cs8DuQrOA7oKzQO7CswDvArLA70KygO+CskDvwrIA8AKxwPBCscDwQrGA8IKxQPDCsQDxArDA8UKwgPGCsEDxwrAA8gKuQPPCrMD1QqvA9kKqgPeCqcD4QqjA+UKoAPoCp0D6wqbA+0KmAPwCpYD8gqTA/UKkQP3Co8D+QqNA/sKiwP9CokD/wqHA4ELhQODC4MDhQuBA4cL/wKJC/4Cigv8AowL+gKOC/kCjwv3ApEL9gKSC/QClAvzApUL8gKWC/ACmAvvApkL7gKaC+wCnAvrAp0L6gKeC+kCnwvnAqEL5QKjC+QCpAviAqYL4QKnC98CqQveAqoL3QKrC9sCrQvaAq4L2QKvC9cCsQvWArIL1QKzC9QCtAvTArUL0QK3C9ACuAvPArkLzgK6C80CuwvMArwLywK9C8oCvgvJAr8LyALAC8cCwQvGAsILxQLDC8QCxAvDAsULwgLGC8ECxwvAAsgLvwLJC74Cygu9AssLvALMC7sCzQu6As4LuQLPC7gC0Au3AtELtgLSC7UC0wu0AtQLswLVC7IC1guxAtcLsALYC68C2QuuAtoLrQLbC6wC3AurAt0LqgLeC6kC3wuoAuALpwLhC6YC4gulAuMLpALkC6MC5QuiAuYLoQLnC6AC6AueAuoLnQLrC5wC7AuaAu4LmQLvC5gC8AuXAvELlgLyC5UC8wuTAvULkgL2C5EC9wuQAvgLjwL5C44C+guNAvsLjAL8C4sC/QuKAv4LiQL/C4gCgAyHAoEMhgKCDIUCgwyEAoQMgwKFDIIChgyBAocMgAKIDP8BiQz+AYoM/QGLDPwBjAz7AY0M+gGODPkBjwz4AZAM9wGRDPYBkgz1AZMM9AGUDPMBlQzzAZUM8gGWDPEBlwzwAZgM7wGZDO0BmwzsAZwM6gGeDOkBnwzoAaAM5wGhDOUBowzkAaQM4wGlDOIBpgzhAacM4AGoDN8BqQzdAasM3AGsDNsBrQzaAa4M2QGvDNgBsAzYAbAM1wGxDNYBsgzVAbMM1AG0DNMBtQzSAbYM0QG3DM8BuQzOAboMzQG7DMwBvAzLAb0MygG+DMkBvwzIAcAMxwHBDMYBwgzFAcMMxAHEDMQBxAzDAcUMwgHGDMEBxwzAAcgMvwHJDL4Bygy9AcsMvAHMDLwBzAy6Ac4MuQHPDLgB0Ay3AdEMtgHSDLUB0wy0AdQMsgHWDLEB1wywAdgMrwHZDK4B2gytAdsMrAHcDKoB3gypAd8MqAHgDKcB4QylAeMMpAHkDKMB5QyiAeYMoQHnDKAB6AyfAekMngHqDJ0B6wycAewMmwHtDJoB7gyZAe8MmAHwDJcB8QyWAfIMlQHzDJQB9AyTAfUMkgH2DJIB9gyRAfcMkAH4DI8B+QyOAfoMjgH6DI0B+wyMAfwMiwH9DIsB/QyKAf4MiQH/DIkB/wyIAYANhwGBDYUBgw2EAYQNggGGDYEBhw2AAYgNfooNfYsNfIwNeo4NeY8NeJANd5ENdpINdZMNdJQNc5UNcZcNcJgNbpoNbZsNa50Nap4NaZ8NZ6ENZqINZKQNY6UNYqYNYacNYKgNXqoNXasNXKwNW60NWq4NWa8NWLANVrINVbMNVLQNUrYNUbcNULgNT7kNTroNTLwNS70NSr4NSMANRsINRMQNQ8UNQccNQMgNPsoNPcsNO80NOs4NONANN9ENNtINNdMNM9UNMtYNMdcNMNgNL9kNLdsNLNwNK90NKt4NKd8NKOANJ+ENJuINJeMNJOQNI+UNIuYNIecNIOgNH+kNHuoNHesNHOwNG+0NGu4NGe8NGPANF/ENFvINFvINFfMNFPQNE/UNEvYNEfcNEfcNEPgND/kNDvoNDvoNDfsNDPwNC/0NCv4NCf8NCIAOB4EOBoIOBYMOBIQOBIQOA4UOAoYOAffPNA==',
        markers: [
          {
            id: '933f612f-6279-44f1-a1d2-5c940a26a15a',
            sceneId: '69807e23-8ca3-4f23-a0b6-7b6521c353e1',
            visibility: 0,
            title: 'Demo marker',
            label: 'TS',
            imageLocation: null,
            imageScale: 1,
            positionX: 30.272367355351435,
            positionY: -990.2723673553514,
            shape: 1,
            shapeColor: '#004ba2',
            size: 1,
            note: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'This marker is viewable by the DM and players. Right click on the marker to change at any time.'
                    }
                  ]
                }
              ]
            },
            pinnedTooltip: false
          }
        ],
        lights: [
          {
            id: '4e4eaf94-c154-417d-bca5-fa21c9d2c4e6',
            sceneId: '69807e23-8ca3-4f23-a0b6-7b6521c353e1',
            positionX: 14.78282869495979,
            positionY: -1085.9086110956518,
            radius: 20,
            color: '#2fff82',
            style: 'fireflies',
            pulse: 1,
            opacity: 1
          },
          {
            id: '5b93f630-ab02-4c4f-b1d0-4fb2a30834bf',
            sceneId: '69807e23-8ca3-4f23-a0b6-7b6521c353e1',
            positionX: 131.0192434500011,
            positionY: -539.5317680361625,
            radius: 2,
            color: '#FFD700',
            style: 'candle',
            pulse: 2,
            opacity: 1
          },
          {
            id: 'a0539856-d7d3-4561-9abe-03d86d8118df',
            sceneId: '69807e23-8ca3-4f23-a0b6-7b6521c353e1',
            positionX: -140.91215835442983,
            positionY: -1002.1550861026708,
            radius: 2,
            color: '#FFD700',
            style: 'candle',
            pulse: 2,
            opacity: 1
          },
          {
            id: 'd0d8263b-9151-45fc-aa61-029825f92698',
            sceneId: '69807e23-8ca3-4f23-a0b6-7b6521c353e1',
            positionX: 324.77036723565834,
            positionY: -850.5533088499803,
            radius: 2,
            color: '#FFD700',
            style: 'candle',
            pulse: 2,
            opacity: 1
          }
        ],
        annotations: [
          {
            id: '3217b782-de4f-4ba7-aa87-f29f0207ff65',
            sceneId: '69807e23-8ca3-4f23-a0b6-7b6521c353e1',
            name: 'Drawing 1',
            opacity: 1,
            color: '#8b5cf6',
            url: null,
            visibility: 1,
            order: 0,
            effectType: null,
            mask: null
          }
        ]
      }
    ]
  }
};
